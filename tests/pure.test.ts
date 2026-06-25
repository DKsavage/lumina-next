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
