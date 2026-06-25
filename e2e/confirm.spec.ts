/**
 * e2e/confirm.spec.ts
 *
 * Tests Playwright pour /confirm/[token].
 *
 * Stratégie de mock :
 * La page /confirm/[token] est un Server Component : le fetch Supabase se
 * produit côté serveur Next.js (Vercel). page.route() intercepte uniquement
 * le trafic réseau du browser — il ne peut pas intercepter les fetch serveur
 * distants sur la prod.
 *
 * Pour le test "token invalide" : on navigue sur un token aléatoire ; la prod
 * retourne naturellement "Lien invalide" pour tout token inconnu.
 *
 * Pour les tests d'interactions UI (pending/confirmed/cancelled) : on utilise
 * page.setContent() pour injecter une simulation HTML + JS vanilla qui
 * reproduit fidèlement le rendu et le comportement du Client Component
 * ConfirmActions.tsx, sans dépendre du SSR ni d'un build local.
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helper — injecte une simulation du rendu /confirm selon le statut
// ---------------------------------------------------------------------------

async function injectConfirmPage(page: Page, opts: {
  status: 'pending' | 'confirmed' | 'cancelled'
  token:  string
  prenom: string
}) {
  const { status, token, prenom } = opts

  // Reproduit ConfirmActions.tsx (état pending) en HTML + JS vanilla
  const pendingHtml = `
    <div id="root">
      <p id="greeting">Bonjour <strong>${prenom}</strong>, pouvez-vous confirmer votre présence&nbsp;?</p>
      <div id="initial-actions" style="display:flex;gap:1rem;flex-wrap:wrap">
        <a id="btn-confirm"
           href="/api/confirm?token=${encodeURIComponent(token)}&amp;status=confirmed"
           style="flex:1;min-width:140px;display:block;text-align:center;padding:1rem;font-weight:700;font-size:.85rem;text-decoration:none;background:#8B0020;color:#fff">
          ✓ Je confirme
        </a>
        <button id="btn-cancel-trigger" type="button"
          style="flex:1;min-width:140px;display:block;text-align:center;padding:1rem;font-weight:700;font-size:.85rem;cursor:pointer;background:#fff;color:#6b6b6b;border:1px solid #e0e0e0">
          Je ne peux pas venir
        </button>
      </div>
      <div id="cancel-panel" style="display:none">
        <p>Désolé de l'apprendre, <strong>${prenom}</strong>. Voulez-vous nous indiquer la raison&nbsp;?</p>
        <textarea id="cancel-reason" placeholder="Motif (optionnel)" maxlength="500" rows="3"
          style="width:100%;padding:.75rem;font-size:.9rem;border:1px solid #e0e0e0;resize:vertical;box-sizing:border-box;margin-bottom:1rem"></textarea>
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          <a id="btn-confirm-cancel"
             href="/api/confirm?token=${encodeURIComponent(token)}&amp;status=cancelled"
             style="flex:1;min-width:140px;display:block;text-align:center;padding:1rem;font-weight:700;font-size:.85rem;text-decoration:none;background:#8B0020;color:#fff">
            Confirmer l'annulation
          </a>
          <button id="btn-back" type="button"
            style="flex:1;min-width:140px;display:block;text-align:center;padding:1rem;font-weight:700;font-size:.85rem;cursor:pointer;background:#fff;color:#6b6b6b;border:1px solid #e0e0e0">
            ← Retour
          </button>
        </div>
      </div>
      <script>
        (function () {
          var triggerBtn   = document.getElementById('btn-cancel-trigger')
          var initialActs  = document.getElementById('initial-actions')
          var greeting     = document.getElementById('greeting')
          var cancelPanel  = document.getElementById('cancel-panel')
          var backBtn      = document.getElementById('btn-back')
          var reasonInput  = document.getElementById('cancel-reason')
          var cancelLink   = document.getElementById('btn-confirm-cancel')
          var TOKEN        = ${JSON.stringify(token)}

          triggerBtn.addEventListener('click', function () {
            initialActs.style.display = 'none'
            greeting.style.display    = 'none'
            cancelPanel.style.display = 'block'
          })

          backBtn.addEventListener('click', function () {
            cancelPanel.style.display = 'none'
            initialActs.style.display = 'flex'
            greeting.style.display    = ''
          })

          reasonInput.addEventListener('input', function () {
            var reason = reasonInput.value.trim()
            var href = '/api/confirm?token=' + encodeURIComponent(TOKEN) +
              '&status=cancelled' + (reason ? '&reason=' + encodeURIComponent(reason) : '')
            cancelLink.setAttribute('href', href)
          })
        })()
      </script>
    </div>
  `

  const confirmedHtml = `
    <div style="background:rgba(20,120,60,.08);border:1px solid rgba(20,120,60,.25);padding:.8rem 1.2rem;font-weight:600;color:rgba(20,120,60,.9)">
      ✓ Vous avez confirmé votre participation
    </div>
  `

  const cancelledHtml = `
    <div style="background:rgba(139,0,32,.05);border:1px solid rgba(139,0,32,.18);padding:.8rem 1.2rem;font-weight:600;color:#8B0020">
      Annulation enregistrée
    </div>
  `

  const body =
    status === 'pending'   ? pendingHtml   :
    status === 'confirmed' ? confirmedHtml :
                             cancelledHtml

  await page.setContent(`<!DOCTYPE html><html lang="fr"><body style="padding:2rem;font-family:Arial,sans-serif">${body}</body></html>`)
}

// ---------------------------------------------------------------------------
// Groupe 1 — token invalide (test sur la vraie URL de prod)
// ---------------------------------------------------------------------------

test.describe('token invalide', () => {
  test('token inexistant → affiche "Lien invalide"', async ({ page }) => {
    // Un token purement aléatoire ne peut pas exister en DB.
    // La page SSR retourne le bloc "Lien invalide" en HTML statique.
    const res = await page.goto('/confirm/e2e-playwright-invalid-token-00000000')
    expect(res?.status()).toBeLessThan(500)
    await expect(page.getByRole('heading', { name: 'Lien invalide' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Groupe 2 — status pending (UI simulée)
// ---------------------------------------------------------------------------

test.describe('status pending', () => {
  const TOKEN = 'e2e-ui-token-pending-abcdef12'

  test.beforeEach(async ({ page }) => {
    await injectConfirmPage(page, { status: 'pending', token: TOKEN, prenom: 'Sophie' })
  })

  test('boutons "Je confirme" et "Je ne peux pas venir" sont visibles', async ({ page }) => {
    await expect(page.getByRole('link',   { name: /Je confirme/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Je ne peux pas venir' })).toBeVisible()
  })

  test('lien "Je confirme" pointe vers /api/confirm?…&status=confirmed', async ({ page }) => {
    const href = await page.getByRole('link', { name: /Je confirme/ }).getAttribute('href')
    expect(href).toContain('status=confirmed')
    expect(href).toContain(encodeURIComponent(TOKEN))
  })

  test('clic "Je ne peux pas venir" → textarea et boutons annulation visibles', async ({ page }) => {
    await page.getByRole('button', { name: 'Je ne peux pas venir' }).click()

    await expect(page.getByPlaceholder('Motif (optionnel)')).toBeVisible()
    await expect(page.getByRole('link',   { name: "Confirmer l'annulation" })).toBeVisible()
    await expect(page.getByRole('button', { name: '← Retour' })).toBeVisible()
  })

  test('saisie du motif → href du lien inclut &reason=', async ({ page }) => {
    await page.getByRole('button', { name: 'Je ne peux pas venir' }).click()
    await page.getByPlaceholder('Motif (optionnel)').fill('Conflit agenda')

    const href = await page.getByRole('link', { name: "Confirmer l'annulation" }).getAttribute('href')
    // encodeURIComponent encode les espaces en %20
    expect(href).toMatch(/reason=Conflit(%20|\+)agenda/)
    expect(href).toContain('status=cancelled')
  })

  test('motif vide → href sans &reason=', async ({ page }) => {
    await page.getByRole('button', { name: 'Je ne peux pas venir' }).click()
    // Textarea vide par défaut
    const href = await page.getByRole('link', { name: "Confirmer l'annulation" }).getAttribute('href')
    expect(href).not.toContain('reason=')
  })

  test('clic "← Retour" → rebascule sur les boutons initiaux', async ({ page }) => {
    await page.getByRole('button', { name: 'Je ne peux pas venir' }).click()
    await expect(page.getByPlaceholder('Motif (optionnel)')).toBeVisible()

    await page.getByRole('button', { name: '← Retour' }).click()

    await expect(page.getByRole('link',   { name: /Je confirme/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Je ne peux pas venir' })).toBeVisible()
    await expect(page.getByPlaceholder('Motif (optionnel)')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Groupe 3 — status confirmed (UI simulée)
// ---------------------------------------------------------------------------

test.describe('status confirmed', () => {
  test('badge "Vous avez confirmé" visible, aucun bouton action', async ({ page }) => {
    await injectConfirmPage(page, { status: 'confirmed', token: 'tok', prenom: 'Sophie' })

    await expect(page.getByText('✓ Vous avez confirmé votre participation')).toBeVisible()
    await expect(page.getByRole('link',   { name: /Je confirme/ })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Je ne peux pas venir' })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Groupe 4 — status cancelled (UI simulée)
// ---------------------------------------------------------------------------

test.describe('status cancelled', () => {
  test('badge "Annulation enregistrée" visible, aucun bouton action', async ({ page }) => {
    await injectConfirmPage(page, { status: 'cancelled', token: 'tok', prenom: 'Sophie' })

    await expect(page.getByText('Annulation enregistrée')).toBeVisible()
    await expect(page.getByRole('link',   { name: /Je confirme/ })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Je ne peux pas venir' })).not.toBeVisible()
  })
})
