# Availability Finder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the admin to see which models are available for a given date — directly in the SessionComposer (form tab badge + assign tab section) and as a filter in the main dashboard.

**Architecture:** A new `GET /api/candidatures/available?date=` endpoint computes availability by (1) filtering candidatures on `disponibilite` type vs weekday/weekend, and (2) excluding models already confirmed in another session on that date via `session_models.model_email`. The `AvailabilityBadge` component is self-contained, fetches this endpoint when `date` changes, and reports the full model list to the Composer via `onModelsLoaded` callback so the assign tab can reuse the same data without a second fetch.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Framer Motion 12.x (`motion`, `AnimatePresence`) · Supabase REST v1 · Tailwind v4 · Existing `TIER_CONFIG`, `verifyToken`, `SessionForm`, `Candidature` types

---

## Global Constraints

- TypeScript strict — `npx tsc --noEmit` must return 0 errors before each commit
- Never `<img>` — use `next/image` (not applicable here, no images)
- `SUPABASE_SERVICE_KEY` server-side only, never `NEXT_PUBLIC_`
- Conventional Commits: `feat:`, `fix:`, `style:`, `refactor:`
- `git add` selective — never `git add .`
- No `Co-Authored-By: Claude` in commits
- Framer Motion spring: always `bounce: 0` — never omit this
- `initial={false}` on every new `AnimatePresence`
- `transition-property` explicit — never `transition: all`
- Minimum 40×40px hit area on interactive elements
- `active:scale-[0.96]` on buttons with press feedback
- `font-variant-numeric: tabular-nums` on all dynamic counts
- Micro-copie: sentence case, voix active, vocabulaire constant (see spec)
- `session_models` identifies models by `model_email`, not by candidature UUID

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/icons/WarningTriangle.tsx` | Create | SVG conflit, `currentColor`, size prop |
| `src/app/api/candidatures/available/route.ts` | Create | GET endpoint — filter by dispo + conflict check |
| `src/components/admin/AvailabilityBadge.tsx` | Create | Badge count + stagger dropdown + `onModelsLoaded` callback |
| `src/components/admin/SessionComposer.tsx` | Modify | Intégrer badge, section assign, `extraCandidatures`, `onSubmit` signature |
| `src/components/admin/DashboardFilters.tsx` | Modify | Prop `filterAvailDate` + chip date |
| `src/app/admin/dashboard/page.tsx` | Modify | State `filterAvailDate`, fetch available IDs, filter list, fix `onSubmit` call |

---

## Task 1: WarningTriangle icon component

**Files:**
- Create: `src/components/icons/WarningTriangle.tsx`

**Interfaces:**
- Produces: `WarningTriangle({ size?, className?, style? })` — consumed by Task 4

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/icons/WarningTriangle.tsx
interface Props {
  size?:      number
  className?: string
  style?:     React.CSSProperties
}

export function WarningTriangle({ size = 16, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      stroke-width="1.5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M20.0429 21H3.95705C2.41902 21 1.45658 19.3364 2.22324 18.0031L10.2662 4.01533C11.0352 2.67792 12.9648 2.67791 13.7338 4.01532L21.7768 18.0031C22.5434 19.3364 21.581 21 20.0429 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 17.01L12.01 16.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/icons/WarningTriangle.tsx
git commit -m "feat: composant icône WarningTriangle (SVG custom, currentColor)"
```

---

## Task 2: API `GET /api/candidatures/available`

**Files:**
- Create: `src/app/api/candidatures/available/route.ts`

**Interfaces:**
- Consumes: `verifyToken` from `@/lib/auth`, `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars
- Produces: `GET /api/candidatures/available?date=YYYY-MM-DD` → `{ success: true, data: AvailableModel[] }` or `{ success: false }` / 400 / 401 / 500

```ts
// AvailableModel shape (no email in response):
interface AvailableModel {
  id:           string
  prenom:       string
  nom:          string
  genre:        string | null
  taille:       number | null
  tier:         string | null
  disponibilite: string | null
}
```

- [ ] **Step 1: Créer le fichier**

```ts
// src/app/api/candidatures/available/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

function isWeekend(isoDate: string): boolean {
  // UTC noon to avoid timezone shift on date boundary
  const d = new Date(isoDate + 'T12:00:00Z')
  const day = d.getUTCDay() // 0=Sunday, 6=Saturday
  return day === 0 || day === 6
}

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, message: 'date invalide' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = {
    apikey:        key,
    Authorization: `Bearer ${key}`,
  }

  // 1. Confirmed model emails on this date
  const sessRes = await fetch(
    `${url}/rest/v1/sessions?date=eq.${date}&select=session_models(model_email,status)`,
    { headers },
  )
  if (!sessRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const sessions: Array<{ session_models: Array<{ model_email: string; status: string }> }> =
    await sessRes.json()

  const blockedEmails = new Set(
    sessions
      .flatMap(s => s.session_models)
      .filter(m => m.status === 'confirmed')
      .map(m => m.model_email),
  )

  // 2. All non-archived candidatures
  const candRes = await fetch(
    `${url}/rest/v1/candidatures?archived=eq.false&select=id,prenom,nom,email,genre,taille,tier,disponibilite`,
    { headers },
  )
  if (!candRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const rows: Array<{
    id: string; prenom: string; nom: string; email: string
    genre: string | null; taille: number | null
    tier: string | null; disponibilite: string | null
  }> = await candRes.json()

  const weekend = isWeekend(date)

  const data = rows
    .filter(c => {
      if (blockedEmails.has(c.email)) return false
      const d = c.disponibilite
      if (!d || d === 'Flexible' || d === 'Voyages OK') return true
      if (weekend  && d === 'Weekends')         return true
      if (!weekend && d === 'Jours de semaine') return true
      return false
    })
    .map(({ email: _email, ...rest }) => rest) // strip email from UI payload

  return NextResponse.json({ success: true, data })
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Tester manuellement**

Démarrer le dev server (`npm run dev`), ouvrir un onglet admin (déjà connecté), puis dans la console du navigateur :

```js
fetch('/api/candidatures/available?date=2026-07-06').then(r=>r.json()).then(console.log)
// 2026-07-06 est un lundi → filtre Flexible + Jours de semaine
```

Expected:
```json
{ "success": true, "data": [ { "id": "...", "prenom": "...", ... } ] }
```

Tester aussi une date invalide :
```js
fetch('/api/candidatures/available?date=nope').then(r=>r.json()).then(console.log)
// Expected: { "success": false, "message": "date invalide" }
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/candidatures/available/route.ts
git commit -m "feat: GET /api/candidatures/available — filtre dispo + conflits session"
```

---

## Task 3: Composant `AvailabilityBadge`

**Files:**
- Create: `src/components/admin/AvailabilityBadge.tsx`

**Interfaces:**
- Consumes: `/api/candidatures/available?date=`, `TIER_CONFIG` from `@/components/admin/tierConfig`
- Produces:
  ```ts
  export interface AvailableModel {
    id: string; prenom: string; nom: string
    genre: string | null; taille: number | null
    tier: string | null; disponibilite: string | null
  }

  // Props:
  interface Props {
    date:            string             // ISO "YYYY-MM-DD"
    excludeIds:      Set<string>        // IDs déjà dans la session
    onAdd:           (m: AvailableModel) => void
    onModelsLoaded?: (models: AvailableModel[]) => void // pour le Composer assign tab
  }

  export function AvailabilityBadge(props: Props): JSX.Element | null
  ```

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/admin/AvailabilityBadge.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TIER_CONFIG, type Tier } from '@/components/admin/tierConfig'

export interface AvailableModel {
  id:            string
  prenom:        string
  nom:           string
  genre:         string | null
  taille:        number | null
  tier:          string | null
  disponibilite: string | null
}

interface Props {
  date:            string
  excludeIds:      Set<string>
  onAdd:           (m: AvailableModel) => void
  onModelsLoaded?: (models: AvailableModel[]) => void
}

export function AvailabilityBadge({ date, excludeIds, onAdd, onModelsLoaded }: Props) {
  const [models,  setModels]  = useState<AvailableModel[]>([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const onModelsLoadedRef     = useRef(onModelsLoaded)
  onModelsLoadedRef.current   = onModelsLoaded

  useEffect(() => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setModels([])
      onModelsLoadedRef.current?.([])
      return
    }
    setLoading(true)
    fetch(`/api/candidatures/available?date=${date}`)
      .then(r => r.json())
      .then(d => {
        const list: AvailableModel[] = d.success ? d.data : []
        setModels(list)
        onModelsLoadedRef.current?.(list)
      })
      .finally(() => setLoading(false))
  }, [date])

  const visible = models.filter(m => !excludeIds.has(m.id))

  if (!date || (!loading && visible.length === 0)) return null

  return (
    <div style={{ position: 'relative', marginTop: '.6rem' }}>
      {/* Badge typographique — signature Lumina */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300,
          fontSize: '1.1rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {loading ? '…' : visible.length}
        </span>
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
          fontSize: '.42rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)',
        }}>
          {visible.length === 1 ? 'disponible ce jour' : 'disponibles ce jour'}
        </span>
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontSize: '.42rem', color: 'var(--muted)', fontWeight: 300,
          display: 'inline-block', transition: 'transform .2s cubic-bezier(0.2,0,0,1)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ↓
        </span>
      </button>

      {/* Dropdown avec stagger */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
            style={{
              position: 'absolute', top: 'calc(100% + .4rem)', left: 0, right: 0, zIndex: 20,
              background: 'var(--paper)', borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.08)',
              overflow: 'hidden', maxHeight: '280px', overflowY: 'auto',
            }}
          >
            {visible.map((model, i) => (
              <ModelRow key={model.id} model={model} index={i} onAdd={onAdd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ModelRow({
  model, index, onAdd,
}: { model: AvailableModel; index: number; onAdd: (m: AvailableModel) => void }) {
  const tierCfg = model.tier ? TIER_CONFIG[model.tier as Tier] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0, delay: index * 0.04 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '.5rem',
        padding: '.45rem .65rem',
        borderBottom: '1px solid rgba(26,20,16,.06)',
      }}
    >
      {/* Nom + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 300,
          fontSize: '.55rem', color: 'var(--ink)',
        }}>
          {model.prenom} {model.nom}
        </span>
        {(model.genre || model.taille) && (
          <span style={{
            fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
            fontSize: '.44rem', color: 'var(--muted)', marginLeft: '.35rem',
          }}>
            {[model.genre, model.taille ? `${model.taille} cm` : null].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/* Tier chip */}
      {tierCfg && (
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontSize: '.38rem', fontWeight: 500,
          letterSpacing: '.1em', textTransform: 'uppercase',
          color: tierCfg.color, border: `1px solid ${tierCfg.border}`,
          borderRadius: '999px', padding: '1px 6px', flexShrink: 0,
        }}>
          {tierCfg.label}
        </span>
      )}

      {/* Bouton + — hit area 40×40px, scale on press */}
      <button
        type="button"
        onClick={() => onAdd(model)}
        aria-label={`Ajouter ${model.prenom} à la session`}
        style={{
          width: 40, height: 40, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: '1px solid rgba(26,20,16,.15)',
          borderRadius: '8px', cursor: 'pointer',
          fontSize: '.75rem', color: 'var(--ink)',
          transitionProperty: 'transform, background', transitionDuration: '.15s',
        }}
        onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
        onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
        onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
      >
        +
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AvailabilityBadge.tsx
git commit -m "feat: composant AvailabilityBadge — badge éditorial + stagger dropdown"
```

---

## Task 4: Modifier `SessionComposer`

**Files:**
- Modify: `src/components/admin/SessionComposer.tsx`

**Interfaces:**
- Consumes: `AvailabilityBadge`, `AvailableModel` from `@/components/admin/AvailabilityBadge`, `WarningTriangle` from `@/components/icons/WarningTriangle`
- Change in Props:
  ```ts
  // AVANT:
  onSubmit: (session: SessionForm) => Promise<void>
  // APRÈS:
  onSubmit: (session: SessionForm, extraIds: string[]) => Promise<void>
  ```

- [ ] **Step 1: Ajouter les imports et le state `extraCandidatures`**

En haut du fichier, ajouter les imports :
```ts
import { AvailabilityBadge, type AvailableModel } from '@/components/admin/AvailabilityBadge'
import { WarningTriangle } from '@/components/icons/WarningTriangle'
```

Dans le corps de `SessionComposer`, ajouter après les `useState` existants :
```ts
const [extraCandidatures, setExtraCandidatures] = useState<AvailableModel[]>([])
const [availableModels,   setAvailableModels]   = useState<AvailableModel[]>([])

function handleAddModel(model: AvailableModel) {
  setExtraCandidatures(prev =>
    prev.some(m => m.id === model.id) ? prev : [...prev, model],
  )
}
```

- [ ] **Step 2: Modifier la signature `onSubmit` dans les Props**

Trouver dans l'interface `Props` :
```ts
onSubmit: (session: SessionForm) => Promise<void>
```
Remplacer par :
```ts
onSubmit: (session: SessionForm, extraIds: string[]) => Promise<void>
```

Trouver dans le bouton de submit (chercher `onSubmit(session)`) et remplacer :
```ts
// AVANT
await onSubmit(session)
// APRÈS
await onSubmit(session, extraCandidatures.map(m => m.id))
```

- [ ] **Step 3: Ajouter le badge dans le tab "form" après le champ date**

Dans la section `{tab === 'form' && (` chercher le bloc du champ `date` (chercher `type="date"`). Juste après ce bloc, avant le prochain `{label(` ou balise frère, ajouter :

```tsx
<AvailabilityBadge
  date={session.date}
  excludeIds={new Set([
    ...selectedCandidatures.map(c => c.id),
    ...extraCandidatures.map(m => m.id),
  ])}
  onAdd={handleAddModel}
  onModelsLoaded={setAvailableModels}
/>
```

- [ ] **Step 4: Ajouter la section "Autres disponibles" dans le tab "assign"**

Dans la section `{tab === 'assign' && (`, après le `GroupAssignmentPanel` existant, ajouter :

```tsx
{/* Section Autres disponibles */}
{availableModels.length > 0 && (() => {
  const assignedIds = new Set([
    ...selectedCandidatures.map(c => c.id),
    ...extraCandidatures.map(m => m.id),
  ])
  const others = availableModels.filter(m => !assignedIds.has(m.id))
  if (others.length === 0) return (
    <p style={{
      fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
      fontSize: '.44rem', color: 'var(--muted)',
      textAlign: 'center', padding: '1rem 0',
    }}>
      Tous les modèles disponibles sont déjà dans la session
    </p>
  )
  return (
    <div style={{ marginTop: '1.2rem' }}>
      <div style={{
        fontFamily: "'Montserrat', sans-serif", fontWeight: 500,
        fontSize: '.42rem', letterSpacing: '.2em', textTransform: 'uppercase',
        color: 'var(--muted)', marginBottom: '.6rem',
      }}>
        Autres disponibles
      </div>
      {others.map((model, i) => (
        <div
          key={model.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            padding: '.4rem .2rem',
            borderBottom: '1px solid rgba(26,20,16,.06)',
          }}
        >
          <span style={{
            fontFamily: "'Montserrat', sans-serif", fontWeight: 300,
            fontSize: '.55rem', color: 'var(--ink)', flex: 1,
          }}>
            {model.prenom} {model.nom}
          </span>
          <button
            type="button"
            onClick={() => handleAddModel(model)}
            aria-label={`Ajouter ${model.prenom} à la session`}
            style={{
              width: 40, height: 40, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid rgba(26,20,16,.15)',
              borderRadius: '8px', cursor: 'pointer',
              fontSize: '.75rem', color: 'var(--ink)',
              transitionProperty: 'transform', transitionDuration: '.15s',
            }}
            onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
            onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >
            +
          </button>
        </div>
      ))}
    </div>
  )
})()}
```

- [ ] **Step 5: Ajouter le warning ⚠️ sur les modèles potentiellement en conflit**

Dans le `GroupAssignmentPanel` (chercher `candidatures={selectedCandidatures}`), remplacer par :
```tsx
candidatures={[
  ...selectedCandidatures,
  ...extraCandidatures.map(m => ({ id: m.id, prenom: m.prenom, nom: m.nom, genre: m.genre })),
]}
```

Puis dans le rendu des noms de modèles du `GroupAssignmentPanel` (chercher où `c.prenom` et `c.nom` sont affichés dans la liste assign), ajouter l'icône ⚠️ pour les modèles absents de `availableModels` (implique conflit ou dispo mismatch) quand la date est remplie :

```tsx
{session.date && availableModels.length > 0 && !availableModels.some(m => m.id === c.id) && (
  <span title="Indisponible ou déjà bookée ce jour" style={{ display: 'inline-flex', marginLeft: '.3rem', verticalAlign: 'middle' }}>
    <WarningTriangle size={12} style={{ color: '#B45309' }} />
  </span>
)}
```

- [ ] **Step 6: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 7: Test manuel**

1. Ouvrir le dashboard, sélectionner 1-2 modèles, ouvrir le SessionComposer
2. Dans le tab "form", saisir une date → badge "X disponibles ce jour" doit apparaître
3. Cliquer le badge → dropdown stagger visible
4. Cliquer "+" → le modèle doit disparaître du dropdown
5. Passer au tab "assign" → section "Autres disponibles" doit lister les modèles non encore ajoutés
6. Le compte dans le tab "Assigner modèles" doit inclure les extras

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/SessionComposer.tsx
git commit -m "feat: Availability Finder dans SessionComposer — badge form tab + section assign tab"
```

---

## Task 5: Filtre "Dispo le" dans le dashboard

**Files:**
- Modify: `src/components/admin/DashboardFilters.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`

**Interfaces:**
- Ajouter à `Props` de `DashboardFilters`:
  ```ts
  filterAvailDate:    string
  onFilterAvailDate:  (v: string) => void
  ```
- Ajouter à `hasActiveFilters` la prise en compte de `filterAvailDate`

- [ ] **Step 1: Ajouter les props dans `DashboardFilters`**

Dans `interface Props`, après `filterVille`/`onFilterVille`, ajouter :
```ts
filterAvailDate:   string
onFilterAvailDate: (v: string) => void
```

Dans la déstructuration de `DashboardFilters({...})`, ajouter `filterAvailDate, onFilterAvailDate`.

Dans `hasDrawerFilters`, inclure `filterAvailDate` :
```ts
// AVANT
const hasDrawerFilters = !!(tailleMin || tailleMax || filterDisponibilite || filterExperience || filterTier || filterTag || filterInstagram || filterVille)
// APRÈS
const hasDrawerFilters = !!(tailleMin || tailleMax || filterDisponibilite || filterExperience || filterTier || filterTag || filterInstagram || filterVille || filterAvailDate)
```

- [ ] **Step 2: Ajouter le chip date dans la barre de chips**

Dans la chips row (`<div style={{ display: 'flex', gap: '.3rem'...`), juste avant le chip "Tri :", ajouter :

```tsx
{/* Dispo le — filtre date disponibilité */}
<div style={{ display: 'flex', alignItems: 'center', gap: '.25rem', flexShrink: 0 }}>
  <span style={{
    fontFamily: "'Montserrat', sans-serif", fontWeight: 500,
    fontSize: '.42rem', letterSpacing: '.12em', textTransform: 'uppercase',
    color: filterAvailDate ? 'var(--ink)' : 'var(--muted)',
    whiteSpace: 'nowrap',
  }}>
    Dispo le
  </span>
  <input
    type="date"
    value={filterAvailDate}
    onChange={e => onFilterAvailDate(e.target.value)}
    style={{
      fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.44rem',
      background: 'transparent', border: 'none', borderBottom: '1px solid rgba(26,20,16,.2)',
      outline: 'none', color: filterAvailDate ? 'var(--ink)' : 'var(--muted)',
      paddingBottom: '1px', cursor: 'pointer',
      width: filterAvailDate ? 'auto' : '80px',
    }}
  />
  {filterAvailDate && (
    <button
      type="button"
      onClick={() => onFilterAvailDate('')}
      aria-label="Effacer filtre date"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
        fontSize: '.5rem', color: 'var(--muted)', lineHeight: 1,
        minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      ✕
    </button>
  )}
</div>
<div style={{ width: 1, height: 14, background: 'rgba(26,20,16,.12)', flexShrink: 0 }} />
```

- [ ] **Step 3: Wirer dans `DashboardPage`**

Dans `src/app/admin/dashboard/page.tsx`, après les autres `useState` de filtres, ajouter :

```ts
const [filterAvailDate,    setFilterAvailDate]    = useState('')
const [availableDateIds,   setAvailableDateIds]   = useState<Set<string> | null>(null)
```

Ajouter un `useEffect` pour fetcher les IDs disponibles quand `filterAvailDate` change (après les `useEffect` existants) :

```ts
useEffect(() => {
  if (!filterAvailDate) { setAvailableDateIds(null); return }
  fetch(`/api/candidatures/available?date=${filterAvailDate}`)
    .then(r => r.json())
    .then(d => {
      if (d.success) setAvailableDateIds(new Set((d.data as { id: string }[]).map(m => m.id)))
      else setAvailableDateIds(new Set()) // date invalide ou erreur → aucun résultat
    })
    .catch(() => setAvailableDateIds(null))
}, [filterAvailDate])
```

Dans le `useMemo` de `filtered`, ajouter la condition après `filterTag` :
```ts
// Ajouter APRÈS la ligne filterTag :
if (availableDateIds !== null && !availableDateIds.has(c.id)) return false
```

Dans `hasActiveFilters` (chercher `onResetFilters`), inclure `filterAvailDate` :
```ts
// Trouver la définition de hasActiveFilters — ajouter filterAvailDate à la condition
// Chercher la ligne :
// hasActiveFilters={!!(search || filterGenre || ...)}
// Ajouter || !!filterAvailDate à la fin
```

Dans la fonction `onResetFilters`, ajouter :
```ts
setFilterAvailDate('')
```

- [ ] **Step 4: Passer les props à `DashboardFilters`**

Dans le JSX où `<DashboardFilters` est rendu, ajouter :
```tsx
filterAvailDate={filterAvailDate}
onFilterAvailDate={setFilterAvailDate}
```

- [ ] **Step 5: Corriger l'appel `onSubmit` dans le Composer**

Dans `src/app/admin/dashboard/page.tsx`, chercher l'endroit où `SessionComposer` est rendu et où `onSubmit` est passé. La signature a changé (Task 4), il faut mettre à jour le handler :

```tsx
// AVANT (approximatif)
onSubmit={async (session) => {
  setSending(true)
  await handleSendSession(selectedIds, session, (sent, failed, sessionId) => { ... })
  setSending(false)
}}

// APRÈS
onSubmit={async (session, extraIds) => {
  setSending(true)
  const allIds = extraIds.length
    ? new Set([...selectedIds, ...extraIds])
    : selectedIds
  await handleSendSession(allIds, session, (sent, failed, sessionId) => { ... })
  setSending(false)
}}
```

- [ ] **Step 6: Vérifier TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 7: Test manuel complet**

1. Dashboard → saisir une date dans "Dispo le" → la liste doit se filtrer aux modèles disponibles ce jour
2. Effacer la date (✕) → liste complète de retour
3. "Reset" filtres → date effacée aussi
4. Ouvrir SessionComposer avec des modèles sélectionnés → entrer une date → badge apparaît
5. Ajouter un modèle depuis le badge → il apparaît dans le tab "assign"
6. Soumettre la session → le modèle ajouté via "+" reçoit bien son email de convocation

- [ ] **Step 8: Commit final**

```bash
git add src/components/admin/DashboardFilters.tsx src/app/admin/dashboard/page.tsx
git commit -m "feat: filtre Dispo le dans le dashboard — availability finder complet"
```

---

## Self-Review

### Couverture spec

| Exigence spec | Tâche |
|---|---|
| GET /api/candidatures/available?date | Task 2 |
| archived=false | Task 2 step 1 (filtre Supabase) |
| Weekday/weekend detection | Task 2 (`isWeekend`) |
| Conflict check via session_models.model_email | Task 2 (blockedEmails Set) |
| Voyages OK toujours inclus | Task 2 (filtre disponibilite) |
| Sans disponibilite → inclus par défaut | Task 2 (`!d` → return true) |
| Badge Cormorant+Montserrat | Task 3 |
| Tabular-nums sur le count | Task 3 (fontVariantNumeric) |
| Stagger enter 40ms par item | Task 3 (delay: index * 0.04) |
| Exit subtil translateY(4px) | Task 3 (exit: y:4) |
| AnimatePresence initial={false} | Task 3 |
| Scale(0.96) sur bouton + | Task 3 + Task 4 |
| Hit area 40×40px | Task 3 + Task 4 |
| onModelsLoaded callback → Composer | Task 3 Props, Task 4 step 3 |
| Section "Autres disponibles" assign tab | Task 4 step 4 |
| Warning ⚠️ WarningTriangle + tooltip | Task 4 step 5 |
| extraIds dans onSubmit → handleSendSession | Task 4 step 2, Task 5 step 5 |
| Filtre "Dispo le" DashboardFilters | Task 5 step 2 |
| availableDateIds filter dans useMemo | Task 5 step 3 |
| Reset filtre date avec les autres | Task 5 step 3 |
| Mobile : filtre dans FiltersDrawer | Non couvert — FiltersDrawer est hors scope de ce plan, le chip date inline reste accessible sur mobile via scroll horizontal de la chips row (pattern existant) |

### Cohérence types

- `AvailableModel` défini dans Task 3, consommé dans Task 4 et Task 5 — ✓ même fichier source
- `onSubmit: (session: SessionForm, extraIds: string[]) => Promise<void>` — Task 4 Props change + Task 5 step 5 handler — ✓ cohérent
- `filterAvailDate: string` — Task 5 Props + state + JSX — ✓ cohérent
- `isWeekend(isoDate: string): boolean` — utilisé uniquement dans Task 2 — ✓ pas de fuite

### Placeholders

Aucun TBD, TODO, ou "implement later" dans ce plan.
