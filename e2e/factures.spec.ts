/**
 * e2e/factures.spec.ts
 *
 * Tests Playwright pour /admin/factures.
 * Même stratégie que dashboard.spec.ts : mock toutes les routes API,
 * jamais de vraie base de données.
 */

import { test, expect, type Page } from '@playwright/test'

const SESSION_GROUPS = [
  {
    session_id: 's1', project: 'Campagne Été', date: '2026-06-12',
    invoices: [
      {
        id: 'sm1', invoice_number: 'FLW-2026-0001', invoice_status: 'paid',
        token: 't1', role: 'Mannequin', model_prenom: 'Julie', model_nom: 'Tremblay',
        model_email: 'julie@example.com', payment_amount: 450,
        session_id: 's1', project: 'Campagne Été', date: '2026-06-12',
      },
    ],
  },
]

async function setupFactures(page: Page, groups = SESSION_GROUPS) {
  await page.route('**/api/refresh', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  )
  await page.route('**/api/factures?*', route => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: groups, groupBy: 'session' }) })
    } else {
      route.continue()
    }
  })
  await page.goto('/admin/factures')
  await page.waitForSelector('text=Campagne Été', { timeout: 15_000 })
}

test.describe('Auth', () => {
  test('sans cookie → redirige vers /admin/login', async ({ page }) => {
    await page.route('**/api/factures?*', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) })
    )
    await page.route('**/api/refresh', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    )
    await page.goto('/admin/factures')
    await page.waitForURL('**/admin/login', { timeout: 10_000 })
    expect(page.url()).toContain('/admin/login')
  })
})

test.describe('Liste', () => {
  test('affiche les groupes de session après chargement', async ({ page }) => {
    await setupFactures(page)
    await expect(page.getByText('Campagne Été')).toBeVisible()
  })

  test('clic sur un groupe → affiche la facture', async ({ page }) => {
    await setupFactures(page)
    await page.getByText('Campagne Été').click()
    await expect(page.getByText('FLW-2026-0001')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Payée' })).toBeVisible()
  })

  test('bascule Par modèle → requête refetch avec groupBy=model', async ({ page }) => {
    await setupFactures(page)
    let requestedGroupBy = ''
    await page.route('**/api/factures?*', route => {
      requestedGroupBy = new URL(route.request().url()).searchParams.get('groupBy') ?? ''
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], groupBy: 'model' }) })
    })
    await page.getByRole('button', { name: 'Par modèle' }).click()
    await expect.poll(() => requestedGroupBy).toBe('model')
  })
})

test.describe('Statut', () => {
  test('clic sur le badge de statut → PATCH puis refetch', async ({ page }) => {
    await setupFactures(page)
    await page.getByText('Campagne Été').click()

    let patchedBody: unknown = null
    await page.route('**/api/factures/sm1', route => {
      patchedBody = route.request().postDataJSON()
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })

    await page.getByRole('button', { name: 'Payée' }).click()
    await expect.poll(() => patchedBody).toEqual({ invoice_status: 'pending' })
  })
})
