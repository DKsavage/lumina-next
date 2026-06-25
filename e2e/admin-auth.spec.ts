/**
 * e2e/admin-auth.spec.ts
 *
 * Tests Playwright pour /admin/login.
 *
 * Stratégie : la page est un Client Component (React). On navigue sur la vraie
 * URL et on intercepte les appels API avec page.route() pour contrôler les
 * réponses sans toucher la base de données ni le service OTP.
 *
 * Routes mockées :
 *   POST /api/otp        — envoi du code (étape email)
 *   POST /api/verify-otp — vérification du code (étape OTP)
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers — setup des mocks réseau
// ---------------------------------------------------------------------------

async function mockOtpSuccess(page: Page) {
  await page.route('**/api/otp', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  )
}

async function mockOtpFailure(page: Page, message: string) {
  await page.route('**/api/otp', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message }),
    }),
  )
}

async function mockVerifyOtpSuccess(page: Page) {
  await page.route('**/api/verify-otp', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  )
}

async function mockVerifyOtpFailure(page: Page, message: string) {
  await page.route('**/api/verify-otp', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message }),
    }),
  )
}

/** Remplit l'email et soumet le formulaire de l'étape 1. */
async function submitEmail(page: Page, email = 'casting@luminamodels.ca') {
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
}

/** Saisit un code OTP et soumet. */
async function submitOtp(page: Page, code = '12345678') {
  // L'input est de type text/inputMode numeric — getByRole 'textbox' le trouve
  await page.locator('input[inputmode="numeric"]').fill(code)
  await page.getByRole('button', { name: 'Accéder au dashboard' }).click()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Page /admin/login', () => {

  test('charge avec le champ email et le bouton "Recevoir le code"', async ({ page }) => {
    await page.goto('/admin/login')

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recevoir le code' })).toBeVisible()
  })

  test('placeholder du champ email est "casting@luminamodels.ca"', async ({ page }) => {
    await page.goto('/admin/login')

    await expect(page.locator('input[type="email"]')).toHaveAttribute(
      'placeholder',
      'casting@luminamodels.ca',
    )
  })

  test('submit email valide → étape OTP visible (input numérique + bouton dashboard)', async ({ page }) => {
    await mockOtpSuccess(page)
    await page.goto('/admin/login')

    await submitEmail(page)

    // L'étape OTP remplace le formulaire email
    await expect(page.locator('input[inputmode="numeric"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accéder au dashboard' })).toBeVisible()
    // L'input email a disparu
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test("étape OTP affiche l'adresse email utilisée", async ({ page }) => {
    await mockOtpSuccess(page)
    await page.goto('/admin/login')

    await submitEmail(page, 'casting@luminamodels.ca')

    await expect(page.getByText('casting@luminamodels.ca')).toBeVisible()
  })

  test("email non reconnu → message d'erreur visible à l'étape email", async ({ page }) => {
    await mockOtpFailure(page, 'Email non reconnu.')
    await page.goto('/admin/login')

    await submitEmail(page, 'inconnu@example.com')

    await expect(page.getByText('Email non reconnu.')).toBeVisible()
    // On reste à l'étape email
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test("OTP invalide → message d'erreur visible à l'étape OTP", async ({ page }) => {
    await mockOtpSuccess(page)
    await mockVerifyOtpFailure(page, 'Code invalide ou expiré.')
    await page.goto('/admin/login')

    await submitEmail(page)
    await submitOtp(page, '00000000')

    await expect(page.getByText('Code invalide ou expiré.')).toBeVisible()
    // On reste à l'étape OTP
    await expect(page.locator('input[inputmode="numeric"]')).toBeVisible()
  })

  test('OTP valide → navigation vers /admin/dashboard', async ({ page }) => {
    await mockOtpSuccess(page)
    await mockVerifyOtpSuccess(page)

    // Mock la page dashboard pour ne pas déclencher d'autres redirections/erreurs
    await page.route('**/admin/dashboard', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><h1>Dashboard</h1></body></html>',
      }),
    )

    await page.goto('/admin/login')
    await submitEmail(page)
    await submitOtp(page, '12345678')

    await page.waitForURL('**/admin/dashboard', { timeout: 10_000 })
    expect(page.url()).toContain('/admin/dashboard')
  })

  test("bouton 'Changer d'email' à l'étape OTP revient à l'étape email", async ({ page }) => {
    await mockOtpSuccess(page)
    await page.goto('/admin/login')

    await submitEmail(page)
    await expect(page.locator('input[inputmode="numeric"]')).toBeVisible()

    await page.getByRole('button', { name: /Changer/i }).click()

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recevoir le code' })).toBeVisible()
  })

  test("erreur API /otp → reste à l'étape email, pas de bascule OTP", async ({ page }) => {
    await mockOtpFailure(page, 'Service temporairement indisponible.')
    await page.goto('/admin/login')

    await submitEmail(page)

    await expect(page.getByText('Service temporairement indisponible.')).toBeVisible()
    await expect(page.locator('input[inputmode="numeric"]')).not.toBeVisible()
  })
})
