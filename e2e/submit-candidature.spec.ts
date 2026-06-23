import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

// JPEG 1×1 px blanc — suffisant pour passer la validation côté client.
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
  'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
  'MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAA' +
  'AAAAAAAAAAAAAAAAAP/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAA' +
  'AAP/aAAwDAQACEQMRAD8AJQAB/9k=',
  'base64',
)

function writeTempJpeg(name: string): string {
  const p = path.join(os.tmpdir(), name)
  fs.writeFileSync(p, MINIMAL_JPEG)
  return p
}

test.describe('Candidature end-to-end', () => {
  test('soumettre une candidature complète avec photos', async ({ page }) => {
    const email = `e2e-playwright-${Date.now()}@test.luminamodels.ca`

    const profilPath = writeTempJpeg('e2e-profil.jpg')
    const bodyPath   = writeTempJpeg('e2e-body.jpg')

    await page.goto('/')

    // Mock /api/submit pour contourner reCAPTCHA (score 0 en headless = rejet serveur).
    // Le front-end est entièrement testé : 4 étapes, validation, upload, screen de confirmation.
    await page.route('/api/submit', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })

    // Attendre que le formulaire soit visible
    await page.waitForSelector('text=Continuer — Profil', { state: 'attached', timeout: 15_000 })

    // ── ÉTAPE 1 : Photos + Identité ───────────────────────────────────────
    // Upload photos via les inputs cachés (force: true car opacity: 0)
    await page.locator('input[aria-label="Visage"]').setInputFiles(profilPath)
    await page.locator('input[aria-label="Full body"]').setInputFiles(bodyPath)

    // Attendre que les previews apparaissent (compression ou lecture FileReader)
    await page.waitForSelector('.up-ring:not(.optimizing)', { timeout: 15_000 })

    // Identité
    await page.locator('input[placeholder="Sophie"]').fill('Sophie')
    await page.locator('input[placeholder="Martin"]').fill('E2E')
    await page.locator('input[placeholder="sophie@exemple.com"]').fill(email)
    await page.locator('input[placeholder="+1 234 567 8900"]').fill('+1 514 000 0000')
    await page.locator('input[placeholder="175"]').fill('172')

    // Genre — chip "Femme" (sélectionné par défaut mais on le clique explicitement)
    await page.locator('button[aria-pressed]', { hasText: 'Femme' }).click()

    await page.locator('text=Continuer — Profil').click()

    // ── ÉTAPE 2 : Profil ─────────────────────────────────────────────────
    await page.waitForSelector('text=Continuer — Mensurations', { timeout: 10_000 })

    await page.locator('input[placeholder="Paris, Montréal, London…"]').fill('Montréal')
    await page.locator('input[placeholder="France, Canada, Belgique…"]').fill('Canada')

    // Expérience — chip
    await page.locator('button.chip', { hasText: 'Quelques shootings' }).click()

    await page.locator('text=Continuer — Mensurations').click()

    // ── ÉTAPE 3 : Mensurations ───────────────────────────────────────────
    await page.waitForSelector('text=Continuer — Disponibilité', { state: 'attached', timeout: 10_000 })

    await page.locator('input[placeholder="88"]').fill('86')
    await page.locator('input[placeholder="68"]').fill('64')
    await page.locator('input[placeholder="92"]').fill('90')

    // Pointure, haut, bas, teint — <select> (pas des chips)
    await page.locator('label:has-text("Pointure EU") select').selectOption('38')
    await page.locator('label:has-text("Haut") select').selectOption('S')
    await page.locator('label:has-text("Pantalon") select').selectOption('26')
    await page.locator('label:has-text("Teint") select').selectOption('Clair')

    // Yeux — chip buttons
    await page.locator('button.chip', { hasText: 'Marron' }).click()
    // Longueur cheveux — chip optionnel
    await page.locator('button.chip', { hasText: 'Mi-long·ue' }).click()

    await page.locator('text=Continuer — Disponibilité').click()

    // ── ÉTAPE 4 : Disponibilité ──────────────────────────────────────────
    await page.waitForSelector('text=Envoyer ma candidature', { timeout: 10_000 })

    await page.locator('input[type="date"]').fill('1998-07-15')
    await page.locator('button.chip', { hasText: 'Flexible' }).click()

    // Soumission
    await page.locator('text=Envoyer ma candidature').click()

    // ── CONFIRMATION ─────────────────────────────────────────────────────
    // Attendre l'écran de confirmation (animation 1.15s max avant que tout soit visible)
    await expect(page.locator('text=Candidature reçue')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator(`text=Sophie`)).toBeVisible({ timeout: 5_000 })
    await expect(page.locator(`text=${email}`)).toBeVisible({ timeout: 5_000 })

    // Nettoyage des fichiers temporaires
    fs.unlinkSync(profilPath)
    fs.unlinkSync(bodyPath)
  })
})
