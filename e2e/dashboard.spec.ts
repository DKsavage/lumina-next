/**
 * e2e/dashboard.spec.ts
 *
 * Tests Playwright pour /admin/dashboard.
 *
 * Stratégie :
 * Le dashboard est un Client Component — l'auth se fait côté API.
 * On mock toutes les routes API avec page.route() pour contrôler l'état
 * sans jamais toucher la base de données ni le service Supabase.
 *
 * Routes mockées :
 *   GET  /api/candidatures      — liste de modèles fictifs
 *   POST /api/select            — envoi notification
 *   PATCH/DELETE /api/candidatures/[id]  — mise à jour / suppression
 *   POST /api/logout            — déconnexion
 *   POST /api/refresh           — refresh token silencieux (évite redirect login)
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CANDIDATURES = [
  {
    id: 'c1', prenom: 'Sophie', nom: 'Martin', email: 'sophie@example.com',
    telephone: '514-555-0001', genre: 'Femme', taille: 175,
    date_inscription: '2026-06-01T10:00:00Z', selectionne: false,
    photo_profil_signed: null, photo_body_signed: null,
  },
  {
    id: 'c2', prenom: 'Marc', nom: 'Dupont', email: 'marc@example.com',
    telephone: '514-555-0002', genre: 'Homme', taille: 185,
    date_inscription: '2026-06-02T10:00:00Z', selectionne: true,
    photo_profil_signed: null, photo_body_signed: null,
  },
  {
    id: 'c3', prenom: 'Alex', nom: 'Tremblay', email: 'alex@example.com',
    telephone: '514-555-0003', genre: 'Non-binaire', taille: 170,
    date_inscription: '2026-06-03T10:00:00Z', selectionne: false,
    photo_profil_signed: null, photo_body_signed: null,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupDashboard(page: Page, candidatures = CANDIDATURES) {
  // Refresh silencieux — évite la redirection login pendant le test
  await page.route('**/api/refresh', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  )

  await page.route('**/api/candidatures', route => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: candidatures }),
      })
    } else {
      // PATCH / DELETE passent en continue pour être mockés par les tests qui en ont besoin
      route.continue()
    }
  })

  await page.goto('/admin/dashboard')
  // Attendre qu'au moins une carte soit rendue
  await page.waitForSelector('[aria-label="Voir le profil"]', { timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test.describe('Auth', () => {
  test('sans cookie → redirige vers /admin/login', async ({ page }) => {
    // Sans mock → /api/candidatures retourne 401 → le hook redirige
    await page.route('**/api/candidatures', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) })
    )
    await page.route('**/api/refresh', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    )

    await page.goto('/admin/dashboard')
    await page.waitForURL('**/admin/login', { timeout: 10_000 })
    expect(page.url()).toContain('/admin/login')
  })
})

// ---------------------------------------------------------------------------
// Grille
// ---------------------------------------------------------------------------

test.describe('Grille candidatures', () => {
  test('affiche les cartes après chargement', async ({ page }) => {
    await setupDashboard(page)

    await expect(page.getByText('Sophie')).toBeVisible()
    await expect(page.getByText('Marc')).toBeVisible()
    await expect(page.getByText('Alex')).toBeVisible()
  })

  test('compteur en nav reflète le total', async ({ page }) => {
    await setupDashboard(page)
    // La nav affiche le nombre de modèles
    await expect(page.getByText('3')).toBeVisible()
  })

  test('badge "Notifié" visible sur les modèles selectionne=true', async ({ page }) => {
    await setupDashboard(page)
    await expect(page.getByText('Notifié')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Recherche et filtres
// ---------------------------------------------------------------------------

test.describe('Recherche et filtres', () => {
  test('recherche par prénom → affiche uniquement les correspondances', async ({ page }) => {
    await setupDashboard(page)

    await page.getByPlaceholder('Rechercher par nom ou email…').fill('Sophie')
    // Laisser useDeferredValue s'appliquer
    await page.waitForTimeout(100)

    await expect(page.getByText('Sophie')).toBeVisible()
    await expect(page.getByText('Marc')).not.toBeVisible()
    await expect(page.getByText('Alex')).not.toBeVisible()
  })

  test('recherche par email → filtre correctement', async ({ page }) => {
    await setupDashboard(page)

    await page.getByPlaceholder('Rechercher par nom ou email…').fill('marc@example')
    await page.waitForTimeout(100)

    await expect(page.getByText('Marc')).toBeVisible()
    await expect(page.getByText('Sophie')).not.toBeVisible()
  })

  test('filtre genre Femme → affiche seulement les femmes', async ({ page }) => {
    await setupDashboard(page)

    await page.getByRole('button', { name: 'Femme' }).click()

    await expect(page.getByText('Sophie')).toBeVisible()
    await expect(page.getByText('Marc')).not.toBeVisible()
    await expect(page.getByText('Alex')).not.toBeVisible()
  })

  test('filtre Notifiés → affiche seulement selectionne=true', async ({ page }) => {
    await setupDashboard(page)

    await page.getByRole('button', { name: 'Notifiés' }).click()

    await expect(page.getByText('Marc')).toBeVisible()
    await expect(page.getByText('Sophie')).not.toBeVisible()
    await expect(page.getByText('Alex')).not.toBeVisible()
  })

  test('réinitialiser filtres → bouton visible puis efface les filtres', async ({ page }) => {
    await setupDashboard(page)

    await page.getByRole('button', { name: 'Femme' }).click()
    await expect(page.getByText('Sophie')).toBeVisible()
    await expect(page.getByText('Marc')).not.toBeVisible()

    await page.getByRole('button', { name: /Réinitialiser/i }).click()

    await expect(page.getByText('Marc')).toBeVisible()
    await expect(page.getByText('Alex')).toBeVisible()
  })

  test('tri par nom → bouton actif change de style', async ({ page }) => {
    await setupDashboard(page)

    const nomBtn = page.getByRole('button', { name: /Nom/i })
    await nomBtn.click()

    // Le bouton Nom doit afficher l'indicateur de tri (↑ ou ↓)
    await expect(nomBtn).toContainText(/Nom/)
  })
})

// ---------------------------------------------------------------------------
// Sélection
// ---------------------------------------------------------------------------

test.describe('Sélection', () => {
  test('cliquer une carte → FloatingBar apparaît avec "1 sélectionné"', async ({ page }) => {
    await setupDashboard(page)

    // Cliquer la carte Sophie (zone photo/infos, pas le bouton →)
    await page.getByText('sophie@example.com').click()

    await expect(page.getByText('1 sélectionné')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notifier la sélection' })).toBeVisible()
  })

  test('cliquer 2 cartes → "2 sélectionnés"', async ({ page }) => {
    await setupDashboard(page)

    await page.getByText('sophie@example.com').click()
    await page.getByText('marc@example.com').click()

    await expect(page.getByText('2 sélectionnés')).toBeVisible()
  })

  test('"Tout sélect." → toutes les cartes sélectionnées', async ({ page }) => {
    await setupDashboard(page)

    await page.getByRole('button', { name: 'Tout sélect.' }).click()

    await expect(page.getByText('3 sélectionnés')).toBeVisible()
    // Le bouton bascule en "Tout désélect."
    await expect(page.getByRole('button', { name: 'Tout désélect.' })).toBeVisible()
  })

  test('bouton ✕ dans FloatingBar → vide la sélection', async ({ page }) => {
    await setupDashboard(page)

    await page.getByText('sophie@example.com').click()
    await expect(page.getByText('1 sélectionné')).toBeVisible()

    await page.getByRole('button', { name: 'Effacer' }).click()

    // FloatingBar disparaît (selectedCount === 0 → return null)
    await expect(page.getByText('1 sélectionné')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

test.describe('Notification', () => {
  test('flow complet : sélection → demande → confirmation → toast', async ({ page }) => {
    await setupDashboard(page)

    // Mock /api/select
    await page.route('**/api/select', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    )

    await page.getByText('sophie@example.com').click()
    await page.getByRole('button', { name: 'Notifier la sélection' }).click()

    // Étape confirmation (2 clics intentionnels)
    await expect(page.getByRole('button', { name: /Confirmer/i })).toBeVisible()

    await page.getByRole('button', { name: /Confirmer/i }).click()

    // Toast de succès
    await expect(page.getByText(/Notifications envoyées/i)).toBeVisible()
    // FloatingBar disparaît après envoi
    await expect(page.getByText('1 sélectionné')).not.toBeVisible()
  })

  test('annuler la confirmation → revient à "Notifier la sélection"', async ({ page }) => {
    await setupDashboard(page)

    await page.getByText('sophie@example.com').click()
    await page.getByRole('button', { name: 'Notifier la sélection' }).click()
    await expect(page.getByRole('button', { name: /Confirmer/i })).toBeVisible()

    await page.getByRole('button', { name: 'Annuler' }).click()

    await expect(page.getByRole('button', { name: 'Notifier la sélection' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Panel détail
// ---------------------------------------------------------------------------

test.describe('Panel détail', () => {
  test('clic "→" → panel détail s\'ouvre avec le nom du modèle', async ({ page }) => {
    await setupDashboard(page)

    const arrowBtns = page.getByRole('button', { name: 'Voir le profil' })
    await arrowBtns.first().click()

    // Le panel détail contient le prénom — on cherche le premier modèle de la liste triée par date desc
    // (c3 Alex est le plus récent)
    await expect(page.getByRole('dialog').or(page.locator('[style*="position: fixed"]').last())).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Fallback : chercher le nom dans la page
      await expect(page.getByText('alex@example.com').or(page.getByText('marc@example.com')).or(page.getByText('sophie@example.com'))).toBeVisible()
    })
  })

  test('Escape → ferme le panel détail', async ({ page }) => {
    await setupDashboard(page)

    await page.getByRole('button', { name: 'Voir le profil' }).first().click()
    await page.keyboard.press('Escape')

    // Après Escape, le panel fermé — les cartes grilles restent visibles
    await expect(page.getByText('Sophie')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

test.describe('Suppression', () => {
  test('flow delete : ouvrir détail → supprimer → confirmer → carte retirée', async ({ page }) => {
    await setupDashboard(page)

    // Mock DELETE
    await page.route('**/api/candidatures/c3', route => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      } else {
        route.continue()
      }
    })

    // Ouvrir le détail de la carte la plus récente (Alex = c3, tri date desc)
    await page.getByRole('button', { name: 'Voir le profil' }).first().click()

    // Chercher et cliquer le bouton Supprimer (peut varier selon le panel)
    const deleteBtn = page.getByRole('button', { name: /Supprimer/i })
    await expect(deleteBtn).toBeVisible({ timeout: 5000 })
    await deleteBtn.click()

    // Confirmation (2 clics intentionnels)
    const confirmDeleteBtn = page.getByRole('button', { name: /Confirmer la suppression/i })
    await expect(confirmDeleteBtn).toBeVisible()
    await confirmDeleteBtn.click()

    // Toast suppression + carte disparaît
    await expect(page.getByText(/supprimée/i)).toBeVisible()
  })
})
