/**
 * e2e/sessions.spec.ts
 *
 * Tests Playwright pour /admin/sessions.
 *
 * Stratégie :
 * La page est un Client Component — le fetch /api/sessions se fait au mount.
 * On mock toutes les routes API avec page.route() pour contrôler l'état
 * sans toucher Supabase ni le serveur Resend.
 *
 * Routes mockées :
 *   GET  /api/sessions        — liste de sessions fictives
 *   GET  /api/sessions/[id]   — détail d'une session (pour SessionStatusPanel)
 *   GET  /admin/dashboard     — page cible du bouton "← Dashboard"
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSIONS = [
  {
    id: 's1',
    project: 'Campagne Hiver 2026',
    type: 'photo',
    date: '2026-12-15',
    status: 'sent',
    created_at: '2026-06-01T10:00:00Z',
    stats: { confirmed: 3, cancelled: 1, pending: 2, total: 6 },
  },
  {
    id: 's2',
    project: 'Lookbook Été',
    type: 'video',
    date: '2026-04-01',
    status: 'sent',
    created_at: '2026-03-01T10:00:00Z',
    stats: { confirmed: 5, cancelled: 0, pending: 0, total: 5 },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Monte les mocks réseau communs et navigue sur /admin/sessions.
 * Attend qu'au moins le projet de la première session soit visible avant
 * de rendre la main — cela évite des race conditions dans les assertions.
 */
async function setupSessions(page: Page, sessions = SESSIONS) {
  // Refresh silencieux — sans lui, le composant redirige vers /admin/login
  // avant même que la liste soit chargée dans certains navigateurs.
  await page.route('**/api/refresh', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  )

  await page.route('**/api/sessions', route => {
    // Ne matcher que la liste (sans segment d'ID supplémentaire)
    const url = route.request().url()
    if (/\/api\/sessions\/[^/]+/.test(url)) {
      route.continue()
      return
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: sessions }),
    })
  })

  await page.goto('/admin/sessions')

  // Attendre le rendu de la liste uniquement si des sessions sont attendues
  if (sessions.length > 0) {
    await page.waitForSelector(`text=${sessions[0].project}`, { timeout: 15_000 })
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test.describe('Auth', () => {
  test('sans auth → redirige vers /admin/login', async ({ page }) => {
    // /api/sessions retourne success: false → le composant redirige
    await page.route('**/api/sessions', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false }),
      }),
    )
    // Pas de mock refresh ici : on simule une session expirée
    await page.route('**/api/refresh', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      }),
    )

    await page.goto('/admin/sessions')
    await page.waitForURL('**/admin/login', { timeout: 10_000 })
    expect(page.url()).toContain('/admin/login')
  })
})

// ---------------------------------------------------------------------------
// Liste des sessions
// ---------------------------------------------------------------------------

test.describe('Liste des sessions', () => {
  test('affiche la liste des sessions', async ({ page }) => {
    await setupSessions(page)

    await expect(page.getByText('Campagne Hiver 2026')).toBeVisible()
    await expect(page.getByText('Lookbook Été')).toBeVisible()
  })

  test('affiche le type correctement (Photo, Vidéo)', async ({ page }) => {
    await setupSessions(page)

    // type 'photo' → "Photo", type 'video' → "Vidéo"
    await expect(page.getByText('Photo')).toBeVisible()
    await expect(page.getByText('Vidéo')).toBeVisible()
  })

  test('badge À VENIR pour date future, PASSÉ pour date passée', async ({ page }) => {
    // s1 : 2026-12-15 → À VENIR (aujourd'hui = 2026-06-25)
    // s2 : 2026-04-01 → PASSÉ
    await setupSessions(page)

    await expect(page.getByText('À VENIR')).toBeVisible()
    await expect(page.getByText('PASSÉ')).toBeVisible()
  })

  test('affiche le taux de confirmation (3/6 et 5/5)', async ({ page }) => {
    await setupSessions(page)

    // Stats s1 : 3 confirmés sur 6
    await expect(page.getByText('3/6')).toBeVisible()
    // Stats s2 : 5 confirmés sur 5
    await expect(page.getByText('5/5')).toBeVisible()
  })

  test('aucune session → affiche "Aucune session"', async ({ page }) => {
    await setupSessions(page, [])

    await expect(page.getByText(/Aucune session/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// SessionStatusPanel
// ---------------------------------------------------------------------------

test.describe('SessionStatusPanel', () => {
  test('clic sur une session → ouvre le panel "Suivi des confirmations"', async ({ page }) => {
    await setupSessions(page)

    // Mock le détail de la session s1 utilisé par SessionStatusPanel
    await page.route('**/api/sessions/s1', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          stats: { confirmed: 3, cancelled: 1, pending: 2, total: 6 },
          session: null,
        }),
      }),
    )

    await page.getByText('Campagne Hiver 2026').click()

    await expect(page.getByText('Suivi des confirmations')).toBeVisible({ timeout: 10_000 })
  })
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe('Navigation', () => {
  test('bouton ← Dashboard → navigue vers /admin/dashboard', async ({ page }) => {
    await setupSessions(page)

    // Mock la page dashboard pour éviter d'autres redirections en cascade
    await page.route('**/admin/dashboard', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><h1>Dashboard</h1></body></html>',
      }),
    )

    await page.getByRole('link', { name: /Dashboard/i })
      .or(page.getByRole('button', { name: /Dashboard/i }))
      .first()
      .click()

    await page.waitForURL('**/admin/dashboard', { timeout: 10_000 })
    expect(page.url()).toContain('/admin/dashboard')
  })
})
