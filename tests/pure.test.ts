/**
 * tests/pure.test.ts
 *
 * Tests des fonctions pures avec node:test + node:assert.
 * Zéro dépendance externe — les fonctions sont copiées directement ici car
 * les chemins @/ (tsconfig paths) ne sont pas résolus par node --test sans
 * transpilation dédiée.
 *
 * Run : node --test tests/pure.test.ts
 *       ou : npm run test:pure
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { buildEmailWrapper, buildCtaButtons, buildInfoBlock, esc as escFromLib } from '../src/lib/email.ts'
import {
  filterInvoices, groupByModel, groupBySession, buildInvoiceCsv,
  type InvoiceRow,
} from '../src/lib/factures.ts'

// ---------------------------------------------------------------------------
// Fonctions pures copiées depuis les sources Next.js
// (source : src/types/candidature.ts)
// ---------------------------------------------------------------------------

interface Candidature {
  id:    string
  email: string
  [key: string]: unknown
}

function isCandidatureArray(data: unknown): data is Candidature[] {
  if (!Array.isArray(data)) return false
  if (data.length === 0) return true
  const first = data[0] as Record<string, unknown>
  return typeof first?.id === 'string' && typeof first?.email === 'string'
}

function calcAge(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ---------------------------------------------------------------------------
// Fonctions pures copiées depuis src/app/api/send-session/route.ts
// et src/app/confirm/[token]/page.tsx (addMins — même logique, nom légèrement
// différent ; la copie ici suit la signature de la spec : addMinutes)
// ---------------------------------------------------------------------------

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.replace('h', ':').split(':').map(Number)
  const total = (h * 60) + (m || 0) + mins
  // % 24 pour gérer l'overflow minuit (ex: 23h45 + 30min → 00h15)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}h${String(total % 60).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Fonction pure copiée depuis src/app/api/confirm/route.ts
// ---------------------------------------------------------------------------

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
}

// ---------------------------------------------------------------------------
// Tests — calcAge
// ---------------------------------------------------------------------------

describe('calcAge', () => {
  test('retourne null pour null', () => {
    assert.equal(calcAge(null), null)
  })

  test('retourne null pour undefined', () => {
    assert.equal(calcAge(undefined), null)
  })

  test('retourne null pour chaîne vide', () => {
    assert.equal(calcAge(''), null)
  })

  test('calcule l\'âge correct pour 2000-01-01 (né avant la date courante de l\'année)', () => {
    const age = calcAge('2000-01-01')
    assert.ok(age !== null, 'age ne doit pas être null')
    const expected = new Date().getFullYear() - 2000
    // L'anniversaire (1er jan) est toujours passé → pas de soustraction -1
    assert.equal(age, expected)
  })

  test('calcule l\'âge correct pour 1990-06-25 (aujourd\'hui = 2026-06-25 → 36 ans)', () => {
    // Date de référence dans le CLAUDE.md : today = 2026-06-25
    // 1990-06-25 → anniversaire exactement aujourd'hui → 36 ans révolus
    const age = calcAge('1990-06-25')
    assert.ok(age !== null)
    // En date réelle : si today < 2026 le résultat diffère — on accepte ±1
    const today = new Date()
    const expectedYear = today.getFullYear() - 1990
    const m = today.getMonth() - 5            // juin = mois 5
    const dayDiff = today.getDate() - 25
    const expected = (m < 0 || (m === 0 && dayDiff < 0)) ? expectedYear - 1 : expectedYear
    assert.equal(age, expected)
  })

  test('soustrait 1 an si anniversaire pas encore passé dans l\'année', () => {
    // Quelqu'un né le 31 décembre — son anniversaire n'est pas encore passé
    // sauf si on est le 31 décembre.
    const birthYear = new Date().getFullYear() - 10
    const dateStr = `${birthYear}-12-31`
    const age = calcAge(dateStr)
    assert.ok(age !== null)
    const today = new Date()
    const isAfterBirthday = today.getMonth() > 11 ||
      (today.getMonth() === 11 && today.getDate() >= 31)
    assert.equal(age, isAfterBirthday ? 10 : 9)
  })
})

// ---------------------------------------------------------------------------
// Tests — addMinutes
// ---------------------------------------------------------------------------

describe('addMinutes', () => {
  test('10h30 + 60 min → 11h30', () => {
    assert.equal(addMinutes('10h30', 60), '11h30')
  })

  test('10h + 30 min → 10h30 (pas de minutes dans l\'entrée)', () => {
    assert.equal(addMinutes('10h', 30), '10h30')
  })

  test('10:30 + 90 min → 12h00 (format HH:MM)', () => {
    assert.equal(addMinutes('10:30', 90), '12h00')
  })

  test('23h45 + 30 min → 00h15 (overflow minuit)', () => {
    // 23*60 + 45 + 30 = 1455 min total
    // Math.floor(1455/60) % 24 = 24 % 24 = 0 → '00h15'
    assert.equal(addMinutes('23h45', 30), '00h15')
  })

  test('00h00 + 0 min → 00h00', () => {
    assert.equal(addMinutes('00h00', 0), '00h00')
  })

  test('09h05 + 5 min → 09h10 (zéro-padding des heures et minutes)', () => {
    assert.equal(addMinutes('09h05', 5), '09h10')
  })

  test('08h00 + 120 min → 10h00', () => {
    assert.equal(addMinutes('08h00', 120), '10h00')
  })
})

// ---------------------------------------------------------------------------
// Tests — isCandidatureArray
// ---------------------------------------------------------------------------

describe('isCandidatureArray', () => {
  test('tableau vide → true', () => {
    assert.equal(isCandidatureArray([]), true)
  })

  test('tableau avec objet valide (id string + email string) → true', () => {
    assert.equal(isCandidatureArray([{ id: '1', email: 'a@b.com' }]), true)
  })

  test('tableau avec plusieurs objets valides → true', () => {
    assert.equal(isCandidatureArray([
      { id: 'abc', email: 'x@y.com' },
      { id: 'def', email: 'z@w.com' },
    ]), true)
  })

  test('null → false', () => {
    assert.equal(isCandidatureArray(null), false)
  })

  test('undefined → false', () => {
    assert.equal(isCandidatureArray(undefined), false)
  })

  test('chaîne → false', () => {
    assert.equal(isCandidatureArray('string'), false)
  })

  test('nombre → false', () => {
    assert.equal(isCandidatureArray(42), false)
  })

  test('objet plain → false', () => {
    assert.equal(isCandidatureArray({ id: '1', email: 'a@b.com' }), false)
  })

  test('id de type number (pas string) → false', () => {
    assert.equal(isCandidatureArray([{ id: 1, email: 'a@b.com' }]), false)
  })

  test('email absent → false', () => {
    assert.equal(isCandidatureArray([{ id: '1' }]), false)
  })

  test('email de type number → false', () => {
    assert.equal(isCandidatureArray([{ id: '1', email: 42 }]), false)
  })
})

// ---------------------------------------------------------------------------
// Tests — esc (échappement HTML)
// ---------------------------------------------------------------------------

describe('esc', () => {
  test('échappe les balises script', () => {
    assert.equal(
      esc('<script>alert(1)</script>'),
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  test('échappe les guillemets doubles', () => {
    assert.equal(esc('"quoted"'), '&quot;quoted&quot;')
  })

  test('échappe l\'esperluette', () => {
    assert.equal(esc('A & B'), 'A &amp; B')
  })

  test('échappe < et > individuellement', () => {
    assert.equal(esc('<b>'), '&lt;b&gt;')
    assert.equal(esc('</b>'), '&lt;/b&gt;')
  })

  test('null → chaîne vide', () => {
    assert.equal(esc(null), '')
  })

  test('undefined → chaîne vide', () => {
    assert.equal(esc(undefined), '')
  })

  test('chaîne sans caractères spéciaux → inchangée', () => {
    assert.equal(esc('bonjour le monde'), 'bonjour le monde')
  })

  test('chaîne vide → chaîne vide', () => {
    assert.equal(esc(''), '')
  })

  test('combinaison de tous les caractères spéciaux', () => {
    assert.equal(
      esc('<a href="page?a=1&b=2">lien</a>'),
      '&lt;a href=&quot;page?a=1&amp;b=2&quot;&gt;lien&lt;/a&gt;',
    )
  })
})

// ---------------------------------------------------------------------------
// Tests — buildEmailWrapper (import depuis src/lib/email.ts)
// ---------------------------------------------------------------------------

describe('buildEmailWrapper', () => {
  test('contient DOCTYPE et structure HTML de base', () => {
    const html = buildEmailWrapper({ projectName: 'Test', bodyEn: '', bodyFr: '' })
    assert.ok(html.includes('<!DOCTYPE html>'))
    assert.ok(html.includes('<body'))
    assert.ok(html.includes('</html>'))
  })

  test('fond extérieur #F7F3EE', () => {
    const html = buildEmailWrapper({ projectName: 'Test', bodyEn: '', bodyFr: '' })
    assert.ok(html.includes('background:#F7F3EE'))
  })

  test('header rouge #8B0020 avec nom du projet échappé', () => {
    const html = buildEmailWrapper({ projectName: 'Lumina Été', bodyEn: '', bodyFr: '' })
    assert.ok(html.includes('background:#8B0020'))
    assert.ok(html.includes('Lumina Été'))
  })

  test('échappe le nom de projet malicieux', () => {
    const html = buildEmailWrapper({ projectName: '<script>xss</script>', bodyEn: '', bodyFr: '' })
    assert.ok(!html.includes('<script>'))
    assert.ok(html.includes('&lt;script&gt;'))
  })

  test('subLabel présent si fourni', () => {
    const html = buildEmailWrapper({ projectName: 'T', subLabel: 'Photoshoot · 15 juillet', bodyEn: '', bodyFr: '' })
    assert.ok(html.includes('Photoshoot · 15 juillet'))
  })

  test('section EN absente si bodyEn vide', () => {
    const html = buildEmailWrapper({ projectName: 'T', bodyEn: '', bodyFr: 'Bonjour' })
    assert.ok(!html.includes('· EN ·'))
    assert.ok(html.includes('· FR ·'))
  })

  test('section FR absente si bodyFr vide', () => {
    const html = buildEmailWrapper({ projectName: 'T', bodyEn: 'Hello', bodyFr: '' })
    assert.ok(!html.includes('· FR ·'))
    assert.ok(html.includes('· EN ·'))
  })

  test('sections EN et FR présentes si les deux fournis', () => {
    const html = buildEmailWrapper({ projectName: 'T', bodyEn: 'Hello', bodyFr: 'Bonjour' })
    assert.ok(html.includes('· EN ·'))
    assert.ok(html.includes('· FR ·'))
  })

  test('footer crème #F7F3EE avec email et domaine', () => {
    const html = buildEmailWrapper({ projectName: 'T', bodyEn: '', bodyFr: '' })
    assert.ok(html.includes('casting@luminamodels.ca'))
    assert.ok(html.includes('luminamodels.ca'))
  })
})

describe('buildCtaButtons', () => {
  test('bouton primaire rouge pleine largeur sans border-radius', () => {
    const html = buildCtaButtons({ primaryLabel: 'Confirmer', primaryUrl: 'https://x.com/c' })
    assert.ok(html.includes('background:#8B0020'))
    assert.ok(html.includes('display:block'))
    assert.ok(html.includes('Confirmer'))
    assert.ok(html.includes('https://x.com/c'))
    assert.ok(!html.includes('border-radius'))
  })

  test('pas de bouton secondaire si non fourni', () => {
    const html = buildCtaButtons({ primaryLabel: 'OK', primaryUrl: 'https://x.com' })
    assert.ok(!html.includes('#E0E0E0'))
  })

  test('bouton secondaire blanc-bordure si fourni', () => {
    const html = buildCtaButtons({
      primaryLabel:   'Confirmer', primaryUrl:   'https://x.com/c',
      secondaryLabel: 'Annuler',   secondaryUrl: 'https://x.com/a',
    })
    assert.ok(html.includes('border:1px solid #E0E0E0'))
    assert.ok(html.includes('Annuler'))
    assert.ok(html.includes('https://x.com/a'))
  })
})

describe('esc (import src/lib/email.ts)', () => {
  test('même comportement que la copie locale', () => {
    assert.equal(escFromLib('<b>test & "val"</b>'), '&lt;b&gt;test &amp; &quot;val&quot;&lt;/b&gt;')
    assert.equal(escFromLib(null), '')
    assert.equal(escFromLib(undefined), '')
  })
})

describe('buildInfoBlock', () => {
  test('label seul — contient Georgia uppercase et séparateur, pas de div valeur', () => {
    const html = buildInfoBlock('Date')
    assert.ok(html.includes('Georgia,serif'))
    assert.ok(html.includes('text-transform:uppercase'))
    assert.ok(html.includes('rgba(139,0,32,0.12)'))
    assert.ok(!html.includes('<div style="margin:0'))  // no value div
  })

  test('label + valueHtml — contient la valeur dans un div', () => {
    const html = buildInfoBlock('Lieu', '2165 Avenue Charlemagne')
    assert.ok(html.includes('Lieu'))
    assert.ok(html.includes('2165 Avenue Charlemagne'))
    assert.ok(html.includes('<div style="margin:0'))  // value div present
  })
})

// ---------------------------------------------------------------------------
// Tests — filterInvoices, groupByModel, groupBySession, buildInvoiceCsv
// ---------------------------------------------------------------------------

const SAMPLE_ROWS: InvoiceRow[] = [
  {
    id: 'sm1', invoice_number: 'FLW-2026-0001', invoice_status: 'paid',
    token: 't1', role: 'Mannequin', model_prenom: 'Julie', model_nom: 'Tremblay',
    model_email: 'julie@example.com', payment_amount: 450,
    session_id: 's1', project: 'Campagne Été', date: '2026-06-12',
  },
  {
    id: 'sm2', invoice_number: 'FLW-2026-0002', invoice_status: 'sent',
    token: 't2', role: 'Mannequin', model_prenom: 'Marc', model_nom: 'Dubois',
    model_email: 'marc@example.com', payment_amount: 300,
    session_id: 's2', project: 'Shooting Produit', date: '2026-06-15',
  },
  {
    id: 'sm3', invoice_number: null, invoice_status: 'pending',
    token: 't3', role: 'Mannequin', model_prenom: 'Julie', model_nom: 'Tremblay',
    model_email: 'julie@example.com', payment_amount: 200,
    session_id: 's3', project: 'Lookbook Hiver', date: '2026-01-20',
  },
]

describe('filterInvoices', () => {
  test('sans filtre → retourne toutes les lignes', () => {
    assert.equal(filterInvoices(SAMPLE_ROWS, {}).length, 3)
  })

  test('filtre par statut', () => {
    const result = filterInvoices(SAMPLE_ROWS, { status: 'paid' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'sm1')
  })

  test('filtre par plage de dates (from)', () => {
    const result = filterInvoices(SAMPLE_ROWS, { from: '2026-06-01' })
    assert.equal(result.length, 2)
  })

  test('filtre par plage de dates (to)', () => {
    const result = filterInvoices(SAMPLE_ROWS, { to: '2026-02-01' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'sm3')
  })

  test('recherche texte sur le nom du modele', () => {
    const result = filterInvoices(SAMPLE_ROWS, { q: 'julie' })
    assert.equal(result.length, 2)
  })

  test('recherche texte sur le projet, insensible a la casse', () => {
    const result = filterInvoices(SAMPLE_ROWS, { q: 'PRODUIT' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'sm2')
  })

  test('recherche sans correspondance → tableau vide', () => {
    assert.equal(filterInvoices(SAMPLE_ROWS, { q: 'zzz' }).length, 0)
  })
})

describe('groupByModel', () => {
  test('regroupe par model_email', () => {
    const groups = groupByModel(SAMPLE_ROWS)
    assert.equal(groups.length, 2)
  })

  test('total_paid ne compte que les factures payees', () => {
    const groups = groupByModel(SAMPLE_ROWS)
    const julie = groups.find(g => g.model_email === 'julie@example.com')!
    assert.equal(julie.total_paid, 450)
    assert.equal(julie.invoices.length, 2)
  })

  test('modele sans facture payee → total_paid = 0', () => {
    const groups = groupByModel(SAMPLE_ROWS)
    const marc = groups.find(g => g.model_email === 'marc@example.com')!
    assert.equal(marc.total_paid, 0)
  })
})

describe('groupBySession', () => {
  test('regroupe par session_id', () => {
    const groups = groupBySession(SAMPLE_ROWS)
    assert.equal(groups.length, 3)
  })

  test('chaque groupe garde le projet et la date de la session', () => {
    const groups = groupBySession(SAMPLE_ROWS)
    const s1 = groups.find(g => g.session_id === 's1')!
    assert.equal(s1.project, 'Campagne Été')
    assert.equal(s1.date, '2026-06-12')
    assert.equal(s1.invoices.length, 1)
  })
})

describe('buildInvoiceCsv', () => {
  test('commence par la directive sep=, puis CRLF', () => {
    const csv = buildInvoiceCsv(SAMPLE_ROWS)
    assert.ok(csv.startsWith('sep=,\r\n'))
  })

  test('produit une ligne par facture, pas tout sur une seule ligne', () => {
    const csv = buildInvoiceCsv(SAMPLE_ROWS)
    const lines = csv.split('\r\n')
    // 1 ligne directive + 1 ligne headers + 3 lignes de données
    assert.equal(lines.length, 5)
  })

  test('les colonnes sont separees par des virgules, valeurs entre guillemets', () => {
    const csv = buildInvoiceCsv(SAMPLE_ROWS)
    const lines = csv.split('\r\n')
    assert.ok(lines[2].includes('"FLW-2026-0001"'))
    assert.ok(lines[2].includes('"paid"'))
    assert.ok(lines[2].includes('"julie@example.com"'))
  })

  test('echappe les guillemets internes', () => {
    const rows: InvoiceRow[] = [{ ...SAMPLE_ROWS[0], project: 'Shoot "Spécial"' }]
    const csv = buildInvoiceCsv(rows)
    assert.ok(csv.includes('""Spécial""'))
  })

  test('montant absent → cellule vide, pas "null"', () => {
    const rows: InvoiceRow[] = [{ ...SAMPLE_ROWS[0], payment_amount: null }]
    const csv = buildInvoiceCsv(rows)
    assert.ok(!csv.includes('null'))
  })
})
