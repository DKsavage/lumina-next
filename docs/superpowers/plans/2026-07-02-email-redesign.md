# Email Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte visuelle des 4 templates d'emails (send-session, remind, confirm, select) vers la direction "Lumina Editorial" — fond crème #F7F3EE, header rouge avec nom de projet en grand, boutons CTA empilés pleine largeur, info blocks avec labels Georgia uppercase, footer crème.

**Architecture:** Extraire un helper partagé `buildEmailWrapper()` dans `src/lib/email.ts` pour éliminer la duplication HTML entre les 4 routes. Chaque route importe les helpers et compose son contenu — la structure wrapper (DOCTYPE, header, footer, couleurs) n'est définie qu'une fois.

**Tech Stack:** TypeScript strict · Next.js App Router API routes · HTML email inline styles · `node --experimental-strip-types` pour les tests

## Global Constraints

- Fond extérieur : `#F7F3EE` (pas `#f3f3f3`)
- Container : `#FFFFFF`, `max-width:600px` (pas 580px)
- Header : `background:#8B0020`, `padding:32px 24px`
- Rouge : `#8B0020` partout (select utilisait `#d4293a` — corriger)
- Corps : `font-size:16px`, `line-height:1.8`, `color:#0A0A0A` (pas 15px / 1.7)
- Boutons : `display:block` (pleine largeur), pas de `border-radius`, empilés verticalement
- Bouton primaire : `background:#8B0020`, `padding:16px`, `font-size:16px`, `font-weight:700`
- Bouton secondaire : `background:#ffffff`, `border:1px solid #E0E0E0`, `padding:14px`, `font-size:14px`
- Labels de section : `font-family:Georgia,serif`, `font-size:10px`, `letter-spacing:0.2em`, `text-transform:uppercase`, `color:#6B6B6B`
- Séparateur section : `border-top:1px solid rgba(139,0,32,0.12)`
- Séparateur bilingue EN/FR : `· EN ·` / `· FR ·` en Georgia 9px `#8B0020` centré
- Footer : `background:#F7F3EE`, `padding:24px`, Georgia 13px `#8B0020` + Arial 12px `#6B6B6B`
- `esc()` exportée depuis `src/lib/email.ts` — supprimer toutes les copies locales
- `npx tsc --noEmit` → 0 erreur avant chaque commit
- Conventional commits : `feat:`, `style:`, `refactor:`
- `git add` sélectif — jamais `git add .`
- Pas de `Co-Authored-By: Claude`

---

### Task 1: Créer `src/lib/email.ts` — helpers partagés

**Files:**
- Create: `src/lib/email.ts`
- Modify: `tests/pure.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function esc(s: string | null | undefined): string
  export function buildCtaButtons(opts: {
    primaryLabel:    string
    primaryUrl:      string
    secondaryLabel?: string
    secondaryUrl?:   string
  }): string
  export function buildInfoBlock(label: string, valueHtml?: string): string
  export function buildEmailWrapper(opts: {
    projectName: string
    subLabel?:   string
    bodyEn:      string
    bodyFr:      string
  }): string
  ```

- [ ] **Step 1: Ajouter les imports dans `tests/pure.test.ts`**

Au début du fichier, après les imports node existants, ajouter :
```ts
import { buildEmailWrapper, buildCtaButtons, esc as escFromLib } from '../src/lib/email.ts'
```

- [ ] **Step 2: Ajouter les tests dans `tests/pure.test.ts`**

À la fin du fichier, ajouter :
```ts
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
```

- [ ] **Step 3: Lancer les tests — ils doivent échouer (module non trouvé)**

```bash
npm run test:pure 2>&1 | tail -20
```
Expected : `Error: Cannot find module '../src/lib/email.ts'` ou équivalent.

- [ ] **Step 4: Créer `src/lib/email.ts`**

```ts
// Helpers partagés pour tous les templates d'emails HTML.
// Inline styles uniquement — les clients email n'acceptent pas les feuilles CSS externes.

export function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Boutons CTA empilés verticalement, pleine largeur, sans border-radius.
// Le bouton secondaire (annuler) est optionnel et toujours moins saillant.
export function buildCtaButtons(opts: {
  primaryLabel:    string
  primaryUrl:      string
  secondaryLabel?: string
  secondaryUrl?:   string
}): string {
  const primary = `<tr><td>
    <a href="${opts.primaryUrl}" style="display:block;background:#8B0020;color:#ffffff;padding:16px;font-size:16px;font-weight:700;text-align:center;text-decoration:none;font-family:Arial,sans-serif;">${opts.primaryLabel}</a>
  </td></tr>`
  const secondary = opts.secondaryLabel && opts.secondaryUrl
    ? `<tr><td style="padding-top:10px;">
        <a href="${opts.secondaryUrl}" style="display:block;background:#ffffff;color:#6B6B6B;padding:14px;font-size:14px;text-align:center;text-decoration:none;border:1px solid #E0E0E0;font-family:Arial,sans-serif;">${opts.secondaryLabel}</a>
      </td></tr>`
    : ''
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">${primary}${secondary}</table>`
}

// Label Georgia uppercase + ligne fine rgba(139,0,32,0.12) + valeur HTML optionnelle.
// Passer valueHtml=undefined pour n'afficher que le label+ligne (ex: avant un tableau de groupes).
export function buildInfoBlock(label: string, valueHtml?: string): string {
  const value = valueHtml != null
    ? `<div style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">${valueHtml}</div>`
    : ''
  return `<p style="margin:24px 0 0;font-size:10px;font-family:Georgia,serif;letter-spacing:0.2em;text-transform:uppercase;color:#6B6B6B;">${label}</p>
<div style="border-top:1px solid rgba(139,0,32,0.12);margin:6px 0 8px;"></div>${value}`
}

interface EmailWrapperOpts {
  projectName: string   // Titre principal du header (nom de projet ou "Félicitations")
  subLabel?:   string   // Ligne secondaire du header (type · date, ou type de rappel)
  bodyEn:      string   // HTML section EN — omis si chaîne vide
  bodyFr:      string   // HTML section FR — omis si chaîne vide
}

export function buildEmailWrapper(opts: EmailWrapperOpts): string {
  const { projectName, subLabel, bodyEn, bodyFr } = opts

  const langDivider = (lang: string) => `
    <tr><td style="padding:0 24px;">
      <p style="margin:24px 0 12px;font-size:9px;font-family:Georgia,serif;letter-spacing:0.22em;text-transform:uppercase;color:#8B0020;text-align:center;">· ${lang} ·</p>
      <div style="border-top:1px solid rgba(139,0,32,0.12);"></div>
    </td></tr>`

  const sectionEn = bodyEn
    ? `${langDivider('EN')}<tr><td style="padding:24px 24px 32px;">${bodyEn}</td></tr>`
    : ''
  const sectionFr = bodyFr
    ? `${langDivider('FR')}<tr><td style="padding:24px 24px 32px;">${bodyFr}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3EE;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:24px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#8B0020;padding:32px 24px;">
    <p style="margin:0 0 16px;font-size:10px;font-family:Georgia,serif;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.7);">FLAWA MODELS</p>
    <p style="margin:0;font-size:26px;font-family:Georgia,serif;font-weight:700;color:#ffffff;line-height:1.2;">${esc(projectName)}</p>
    ${subLabel ? `<p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;">${esc(subLabel)}</p>` : ''}
  </td></tr>
  ${sectionEn}
  ${sectionFr}
  <tr><td style="background:#F7F3EE;padding:24px;">
    <p style="margin:0 0 4px;font-size:13px;font-family:Georgia,serif;letter-spacing:0.12em;text-transform:uppercase;color:#8B0020;font-weight:700;">FLAWA MODELS</p>
    <p style="margin:0;font-size:12px;color:#6B6B6B;font-family:Arial,sans-serif;">casting@luminamodels.ca &nbsp;·&nbsp; luminamodels.ca &nbsp;·&nbsp; Montréal</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
```

- [ ] **Step 5: Lancer les tests — doivent passer**

```bash
npm run test:pure 2>&1 | tail -10
```
Expected : `pass 46` (33 existants + 13 nouveaux), `fail 0`

- [ ] **Step 6: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected : aucune sortie (0 erreur)

- [ ] **Step 7: Commit**

```bash
git add src/lib/email.ts tests/pure.test.ts
git commit -m "feat: src/lib/email.ts — buildEmailWrapper, buildCtaButtons, buildInfoBlock, esc partagés"
```

---

### Task 2: Mettre à jour `send-session/route.ts`

**Files:**
- Modify: `src/app/api/send-session/route.ts`

**Interfaces:**
- Consumes: `esc`, `buildCtaButtons`, `buildInfoBlock`, `buildEmailWrapper` depuis `@/lib/email`
- La signature de `buildEmail(params)` et `POST(request)` ne changent pas — seul le HTML produit change

- [ ] **Step 1: Remplacer l'import et supprimer `esc()` locale**

En haut du fichier, ajouter après les imports existants :
```ts
import { esc, buildCtaButtons, buildInfoBlock, buildEmailWrapper } from '@/lib/email'
```

Supprimer la définition locale de `esc()` si elle existe dans ce fichier. Chercher avec :
```bash
grep -n "^function esc\|^  function esc" src/app/api/send-session/route.ts
```

- [ ] **Step 2: Mettre à jour `buildEmail()` — outer wrapper**

Localiser le `return \`<!DOCTYPE html>...\`` (vers ligne 213). Remplacer tout le bloc HTML renvoyé par :
```ts
  return buildEmailWrapper({
    projectName: session.project,
    subLabel:    `${typeLabel} · ${dateFr}`,
    bodyEn:      sectionEn,
    bodyFr:      sectionFr,
  })
```

Supprimer les variables qui construisaient le wrapper manuellement (la table extérieure, le header `<span>Flawa Models</span>`, le `<hr>` séparateur EN/FR, le footer). Ces éléments sont maintenant dans `buildEmailWrapper`.

- [ ] **Step 3: Mettre à jour `sectionEn` — corps de la section EN**

Localiser le bloc `sectionEn = \`...\`` (vers ligne 190). Remplacer par :
```ts
    sectionEn = `
      <p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Dear ${esc(prenom)},</p>
      <p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">
        We are pleased to confirm your participation in the ${esc(typeLabelEn)} <strong>${esc(session.project)}</strong>, scheduled for <strong>${esc(dateEn)}</strong>.
      </p>
      ${buildInfoBlock('Location', `${esc(session.address)}${accessEn ? `<br><span style="font-size:14px;color:#6B6B6B;">${esc(session.access_instructions)}</span>` : ''}`)}
      ${buildInfoBlock('Schedule')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${groupRowsEn}</table>
      ${prepEn}${lookEn}${bringEn}${teamEn}${compensationEn}${contactEn}${notesEn}${moodEn}${wappEn}
      <p style="margin:24px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Kindly confirm your attendance no later than <strong>${esc(deadlineEn)}</strong>:</p>
      ${buildCtaButtons({ primaryLabel: 'Confirm my attendance', primaryUrl: confirmUrl, secondaryLabel: 'Unable to attend', secondaryUrl: cancelUrl })}
      <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;font-family:Arial,sans-serif;">We look forward to seeing you.</p>`
```

Note: `accessEn` est déjà construit comme `<p>...</p>` — l'intégrer dans le `buildInfoBlock('Location')` comme texte secondaire en inline. Si tu préfères garder `accessEn` séparé, laisse-le après `buildInfoBlock('Location')` :
```ts
      ${buildInfoBlock('Location', esc(session.address))}
      ${accessEn}
```

- [ ] **Step 4: Mettre à jour les group rows EN — 16px, #0A0A0A**

Localiser `groupRowsEn` (les `<tr><td>` des groupes). Remplacer le style inline :
```ts
// AVANT:
`<tr><td style="padding:3px 0;font-size:15px;color:#0a0a0a;line-height:1.7;...`
// APRÈS:
`<tr><td style="padding:4px 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;${isOwn ? 'font-weight:700;color:#8B0020;' : ''}">`
```

- [ ] **Step 5: Mettre à jour `sectionFr` — même pattern**

Même traitement que sectionEn mais en français :
```ts
  // Section FR (construite dans le return final, pas dans le bloc {})
  // Remplacer le bloc <tr><td style="padding:0 40px 32px;"> ... </td></tr>
  // par le bodyFr passé à buildEmailWrapper:
  const bodyFr = `
      <p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
      <p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">
        Nous avons le plaisir de confirmer votre participation au ${esc(typeLabel)} <strong>${esc(session.project)}</strong>, prévu le <strong>${esc(dateFr)}</strong>.
      </p>
      ${buildInfoBlock('Lieu', esc(session.address))}
      ${accessFr}
      ${buildInfoBlock('Planning')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${groupRowsFr}</table>
      ${prepFr}${lookFr}${bringFr}${teamFr}${compensationFr}${contactFr}${notesFr}${moodFr}${wappFr}
      <p style="margin:24px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous vous remercions de confirmer votre disponibilité au plus tard le <strong>${esc(deadline)}</strong> :</p>
      ${buildCtaButtons({ primaryLabel: 'Confirmer ma présence', primaryUrl: confirmUrl, secondaryLabel: 'Je ne serai pas disponible', secondaryUrl: cancelUrl })}
      <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;font-family:Arial,sans-serif;">Nous nous réjouissons de vous retrouver.</p>`
```

- [ ] **Step 6: Mettre à jour les group rows FR — 16px**

Même traitement que Step 4 pour `groupRowsFr`.

- [ ] **Step 7: Mettre à jour les blocs prep, look, compensation, team**

Localiser les variables `prepFr`, `lookFr`, `compensationFr`, `teamFr`. Mettre à jour `font-size:15px` → `font-size:16px` et `line-height:1.7` → `line-height:1.8`. Pour `prepFr` et `lookFr`, remplacer le fond `#f9f6f2;border-left:3px solid #8B0020` par `background:#F7F3EE` sans border-left :

```ts
// prepFr AVANT:
`background:#f9f6f2;border-left:3px solid #8B0020;padding:12px 16px`
// prepFr APRÈS:
`background:#F7F3EE;padding:12px 16px`
```

Même pour `prepEn`, `lookEn`, `lookFr`.

- [ ] **Step 8: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/send-session/route.ts
git commit -m "style: send-session — Lumina Editorial email design (wrapper, CTA empilés, 16px)"
```

---

### Task 3: Mettre à jour `remind/route.ts`

**Files:**
- Modify: `src/app/api/sessions/remind/route.ts`

**Interfaces:**
- Consumes: `esc`, `buildCtaButtons`, `buildEmailWrapper` depuis `@/lib/email`
- `buildReminderHtml()` : signature inchangée — retourne toujours `{ subject: string; html: string }`
- `sentAtField()` : inchangée

- [ ] **Step 1: Ajouter l'import, supprimer `esc()` locale**

```ts
import { esc, buildCtaButtons, buildEmailWrapper } from '@/lib/email'
```
Supprimer la définition locale de `esc()` (lignes 13-16).

- [ ] **Step 2: Supprimer `sep` et mettre à jour le type `merci`**

Supprimer la variable `const sep = \`<hr...>\`` (ligne 51).

Remplacer le bloc `if (type === 'merci')` par :
```ts
  if (type === 'merci') {
    return {
      subject: `Thank you / Merci — ${esc(project)}`,
      html: buildEmailWrapper({
        projectName: project,
        subLabel:    'Remerciement · Thank you',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Thank you so much for being part of <strong>${esc(project)}</strong>! It was a genuine pleasure working with you. We'll share the results as soon as they're ready.</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We hope to work with you again soon!</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Merci beaucoup d'avoir participé à <strong>${esc(project)}</strong> ! Ce fut un vrai plaisir de travailler avec vous. Nous partagerons les résultats dès qu'ils seront prêts.</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Au plaisir de vous revoir très bientôt !</p>`,
      }),
    }
  }
```

- [ ] **Step 3: Mettre à jour le type `paiement`**

```ts
  if (type === 'paiement') {
    const payDetails  = [compensationAmount, compensationMethod, compensationDelay].filter(Boolean).join(' · ')
    const factureLink = `${SITE_URL}/facture/${token}`
    return {
      subject: `Payment sent / Paiement envoyé — ${esc(project)}`,
      html: buildEmailWrapper({
        projectName: project,
        subLabel:    'Paiement · Payment',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Your payment for <strong>${esc(project)}</strong> has been sent.${payDetails ? ` <strong>${esc(payDetails)}</strong>` : ''}</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Please use the link below to generate your invoice and return it to us at luminaphotography.mtl@gmail.com:</p>
${buildCtaButtons({ primaryLabel: 'Generate my invoice', primaryUrl: factureLink })}
<p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;">Thank you again for your participation!</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Votre paiement pour <strong>${esc(project)}</strong> a été envoyé.${payDetails ? ` <strong>${esc(payDetails)}</strong>` : ''}</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Veuillez utiliser le lien ci-dessous pour générer votre facture et nous la retourner à luminaphotography.mtl@gmail.com :</p>
${buildCtaButtons({ primaryLabel: 'Générer ma facture', primaryUrl: factureLink })}
<p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;">Merci encore pour votre participation !</p>`,
      }),
    }
  }
```

- [ ] **Step 4: Mettre à jour les types `j1` et `morning`**

```ts
  if (type === 'j1' || type === 'morning') {
    const subjectEn  = type === 'morning' ? `See you today — ${esc(project)}` : `See you tomorrow — ${esc(project)}`
    const subjectFr  = type === 'morning' ? `À tout à l'heure — ${esc(project)}` : `À demain — ${esc(project)}`
    const introEn    = type === 'morning' ? "We're expecting you today!" : "Your shoot is tomorrow —"
    const introFr    = type === 'morning' ? "On vous attend aujourd'hui !" : 'Votre shoot est demain —'
    const detailsEn  = [
      `<strong>Date:</strong> ${esc(dateLabelEn)}`,
      `<strong>Location:</strong> ${esc(address)}`,
      callTime ? `<strong>Your call time:</strong> <span style="color:#8B0020;font-weight:700;">${esc(callTime)}</span>` : '',
      contact  ? `<strong>On-site contact:</strong> ${esc(contact)}` : '',
    ].filter(Boolean).map(d => `<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">${d}</p>`).join('')
    const detailsFr  = [
      `<strong>Date :</strong> ${esc(dateLabel)}`,
      `<strong>Lieu :</strong> ${esc(address)}`,
      callTime ? `<strong>Votre call time :</strong> <span style="color:#8B0020;font-weight:700;">${esc(callTime)}</span>` : '',
      contact  ? `<strong>Contact sur place :</strong> ${esc(contact)}` : '',
    ].filter(Boolean).map(d => `<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">${d}</p>`).join('')
    return {
      subject: `${subjectEn} / ${subjectFr}`,
      html: buildEmailWrapper({
        projectName: project,
        subLabel:    `${esc(dateLabelEn)}`,
        bodyEn: `<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)}, ${introEn} here's everything you need:</p>${detailsEn}<p style="margin:12px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">See you soon!</p>`,
        bodyFr: `<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, ${introFr} voici tout ce qu'il faut savoir :</p>${detailsFr}<p style="margin:12px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">À très bientôt !</p>`,
      }),
    }
  }
```

- [ ] **Step 5: Mettre à jour les types `j5` et `j2` (return final)**

```ts
  return {
    subject: `Reminder: confirm your attendance / Rappel : confirmez votre participation — ${esc(project)}`,
    html: buildEmailWrapper({
      projectName: project,
      subLabel:    `Rappel · ${esc(dateLabelEn)}`,
      bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)},</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We haven't received your confirmation for <strong>${esc(project)}</strong> on <strong>${esc(dateLabelEn)}</strong>. Could you confirm your attendance?</p>
${buildCtaButtons({ primaryLabel: '✓ I confirm', primaryUrl: confirmUrl, secondaryLabel: 'I cannot attend', secondaryUrl: cancelUrl })}`,
      bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous n'avons pas encore reçu votre confirmation pour <strong>${esc(project)}</strong> le <strong>${esc(dateLabel)}</strong>. Pouvez-vous nous confirmer votre présence ?</p>
${buildCtaButtons({ primaryLabel: '✓ Je confirme', primaryUrl: confirmUrl, secondaryLabel: 'Je ne peux pas venir', secondaryUrl: cancelUrl })}`,
    }),
  }
```

- [ ] **Step 6: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/sessions/remind/route.ts
git commit -m "style: remind — Lumina Editorial email design (buildEmailWrapper, CTA empilés)"
```

---

### Task 4: Mettre à jour `confirm/route.ts`

**Files:**
- Modify: `src/app/api/confirm/route.ts`

**Interfaces:**
- Consumes: `esc`, `buildInfoBlock`, `buildEmailWrapper` depuis `@/lib/email`
- La logique métier (DB updates, redirect) est inchangée
- Email admin (annulation) : non redesigné — c'est une notification interne

- [ ] **Step 1: Ajouter l'import, supprimer `esc()` locale**

En haut du fichier :
```ts
import { esc, buildInfoBlock, buildEmailWrapper } from '@/lib/email'
```
Supprimer la définition locale de `esc()`.

- [ ] **Step 2: Mettre à jour `modelHtml` — email de confirmation**

Localiser `const modelHtml = status === 'confirmed' ? \`<!DOCTYPE html>...\`` (vers ligne 122). Remplacer le bloc HTML du cas `confirmed` par :

```ts
  const modelHtml = status === 'confirmed'
    ? buildEmailWrapper({
        projectName: session.project,
        subLabel:    'Participation confirmée · Confirmed',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Dear ${esc(sm.model_prenom)},</p>
<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Your participation in <strong>${esc(session.project)}</strong> has been confirmed.</p>
${buildInfoBlock('Date', esc(dateEn))}
${buildInfoBlock('Location', esc(session.address))}
${group?.call_time ? buildInfoBlock('Your Call Time', `<span style="font-size:20px;font-weight:700;color:#8B0020;">${esc(group.call_time)}</span>`) : ''}
<p style="margin:24px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">We look forward to seeing you.</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(sm.model_prenom)},</p>
<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Votre participation au projet <strong>${esc(session.project)}</strong> a bien été confirmée.</p>
${buildInfoBlock('Date', esc(dateFr))}
${buildInfoBlock('Lieu', esc(session.address))}
${group?.call_time ? buildInfoBlock('Votre Call Time', `<span style="font-size:20px;font-weight:700;color:#8B0020;">${esc(group.call_time)}</span>`) : ''}
<p style="margin:24px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">Nous nous réjouissons de vous retrouver.</p>`,
      })
```

- [ ] **Step 3: Mettre à jour `modelHtml` — email d'annulation**

Remplacer le bloc HTML du cas `cancelled` (le `: \`<!DOCTYPE html>...\``) par :
```ts
    : buildEmailWrapper({
        projectName: session.project,
        subLabel:    'Annulation enregistrée · Cancellation recorded',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Dear ${esc(sm.model_prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We have received your cancellation for <strong>${esc(session.project)}</strong>.</p>
<p style="margin:0;font-size:14px;color:#6B6B6B;line-height:1.8;font-family:Arial,sans-serif;">We understand that scheduling conflicts may arise. Thank you for notifying us promptly. We hope to work with you on a future project.</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(sm.model_prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous avons bien pris note de votre annulation pour le projet <strong>${esc(session.project)}</strong>.</p>
<p style="margin:0;font-size:14px;color:#6B6B6B;line-height:1.8;font-family:Arial,sans-serif;">Nous comprenons que des imprévus puissent survenir. Merci de nous en avoir informés dans les meilleurs délais. Nous espérons avoir l'occasion de travailler avec vous lors d'un prochain projet.</p>`,
      })
```

Note: l'email `adminHtml` (notification interne d'annulation) n'est pas redesigné — c'est intentionnel, hors scope.

- [ ] **Step 4: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/confirm/route.ts
git commit -m "style: confirm — Lumina Editorial email design (buildEmailWrapper, buildInfoBlock)"
```

---

### Task 5: Mettre à jour `select/route.ts`

**Files:**
- Modify: `src/app/api/select/route.ts`

**Interfaces:**
- Consumes: `buildEmailWrapper` depuis `@/lib/email`
- La logique métier (DB PATCH selectionne=true) est inchangée
- `#d4293a` dans ce fichier → corriger en `#8B0020`

- [ ] **Step 1: Ajouter l'import**

```ts
import { buildEmailWrapper } from '@/lib/email'
```

- [ ] **Step 2: Remplacer le HTML inline par `buildEmailWrapper`**

Localiser le `html: \`<!DOCTYPE html>...\`` dans le body de `fetch('https://api.resend.com/emails', ...)`. Remplacer par :

```ts
      html: buildEmailWrapper({
        projectName: 'Félicitations',
        subLabel:    'Tu as été sélectionné·e · You have been selected',
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour <strong>${prenom}</strong>,</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous avons le plaisir de t'informer que ton profil a été <strong>sélectionné</strong> pour un projet Flawa Models.</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Tu recevras très prochainement tous les détails concernant la session (date, lieu, heure de call time).</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;font-weight:700;">Merci de répondre à cet email pour confirmer ta disponibilité.</p>`,
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi <strong>${prenom}</strong>,</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We're pleased to let you know that your profile has been <strong>selected</strong> for a Flawa Models project.</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">You will receive all the details about the session (date, location, call time) very soon.</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;font-weight:700;">Please reply to this email to confirm your availability.</p>`,
      }),
```

Note: `bodyFr` passé en premier (FR avant EN dans le body) car ce modèle de communication est initié en FR. `buildEmailWrapper` les affiche dans l'ordre bodyEn → bodyFr — si la convention FR-d'abord est importante, inverser les arguments `bodyEn`/`bodyFr` dans l'appel ET dans `buildEmailWrapper` pour ce cas. Choix le plus simple : garder EN-d'abord comme les autres templates pour la cohérence.

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected : 0 erreur.

- [ ] **Step 4: Lancer la suite de tests**

```bash
npm run test:pure 2>&1 | tail -10
```
Expected : `pass 46`, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/select/route.ts
git commit -m "style: select — Lumina Editorial email design (buildEmailWrapper, #8B0020)"
```

---

## Vérification finale

Après les 5 tasks :

```bash
npx tsc --noEmit && npm run test:pure
```

Expected : 0 erreur TypeScript, 46 tests passés.

Les emails peuvent être testés visuellement en envoyant un email de test via le dashboard (bouton "Relance J-5" sur une session existante, ou créer une session de test).
