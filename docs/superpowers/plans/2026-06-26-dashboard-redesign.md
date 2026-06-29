# Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le dashboard admin `/admin/dashboard` selon le spec `docs/superpowers/specs/2026-06-26-dashboard-redesign-design.md` — pill nav, double-bezel cards, Ambassadeur dark+or, panel slide-in grille fixe, floating bar spring, skeleton loaders, empty state contextuel.

**Architecture:** Chaque composant existant est refondu en place (pas de réécriture from scratch). Les hooks `useCandidatures` et `useSelection` ne changent pas. La logique de filtrage/tri dans `page.tsx` est conservée, seul le rendu change.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Tailwind v4 · Framer Motion (déjà installé) · CSS custom properties

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/app/globals.css` | Modifier | Ajouter `--gold`, `--gold-light`, `--gold-mid`, `--spring`, grain overlay, skeleton keyframe |
| `src/components/admin/AdminNav.tsx` | Créer | Pill flottante desktop + liens nav + cloche + CTA Session |
| `src/components/admin/KpiStrip.tsx` | Créer | Bande KPI unifiée 4 cellules |
| `src/components/admin/SkeletonCard.tsx` | Créer | Shimmer loader card |
| `src/components/admin/FiltersDrawer.tsx` | Créer | Drawer filtres avancés (taille, dispo, expérience, tier, tag, instagram, ville) |
| `src/components/admin/DashboardFilters.tsx` | Refonte | Chips simples + chip Tri + drawer trigger |
| `src/components/admin/CandidatureCard.tsx` | Refonte | Double-bezel, info B (dispo+tags), Ambassadeur variant, sélection state B |
| `src/components/admin/DetailPanel.tsx` | Refonte | Slide-in droite, tabs, photo carousel, nav clavier hint, actions sticky |
| `src/components/admin/FloatingBar.tsx` | Refonte | Thumbnails empilés, spring animation, layout ink |
| `src/app/admin/dashboard/page.tsx` | Adapter | AdminNav + KpiStrip + grille fixe panel ouvert + SkeletonCard + empty state A |

---

## Task 1 — CSS foundations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Ajouter les variables manquantes dans le bloc `@theme inline`**

Chercher la ligne `--color-champagne:  #C4A05A;` et ajouter après :

```css
  --color-gold:       #C4973A;
  --color-gold-light: rgba(196,151,58,.10);
  --color-gold-mid:   rgba(196,151,58,.28);
  --color-cream-deep: #EDE7DC;
```

- [ ] **Ajouter les custom properties globales après le bloc `@theme`**

```css
/* ── LUMINA DASHBOARD — tokens complémentaires ── */
:root {
  --spring: cubic-bezier(0.32, 0.72, 0, 1);
  --spring-fast: cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-card: 0 1px 3px rgba(26,20,16,.07), 0 2px 6px rgba(26,20,16,.04);
  --shadow-card-hover: 0 3px 8px rgba(26,20,16,.09), 0 1px 3px rgba(26,20,16,.05);
}
```

- [ ] **Ajouter le grain overlay et le skeleton keyframe**

```css
/* Grain overlay — fixed, pointer-events-none, z-index réservé */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 998;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: .028;
}

@keyframes shimmer {
  from { background-position: -300px 0; }
  to   { background-position:  300px 0; }
}
```

- [ ] **Vérifier TypeScript — 0 erreur**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/globals.css
git commit -m "style: variables gold, spring, grain overlay, skeleton keyframe"
```

---

## Task 2 — KpiStrip

**Files:**
- Create: `src/components/admin/KpiStrip.tsx`

- [ ] **Créer le composant**

```tsx
// KpiStrip — bande KPI unifiée 4 cellules. Remplace les 4 boîtes séparées dans la nav.
'use client'

interface KpiItem {
  label:   string
  value:   number
  accent?: boolean
  trend?:  string
}

interface Props { items: KpiItem[] }

export function KpiStrip({ items }: Props) {
  return (
    <div style={{
      display: 'flex',
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: '.85rem',
      overflow: 'hidden',
      boxShadow: '0 1px 0 rgba(255,255,255,.9) inset, var(--shadow-card)',
    }}>
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            padding: '.6rem .7rem',
            position: 'relative',
            background: item.accent ? 'rgba(139,0,32,.03)' : undefined,
            borderLeft: i > 0 ? '1px solid var(--border)' : undefined,
          }}
        >
          {item.accent && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--red)' }} />
          )}
          <div style={{
            fontSize: '.38rem', letterSpacing: '.18em', fontWeight: 500,
            textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.3rem',
            display: 'flex', alignItems: 'center', gap: '.3rem',
          }}>
            {item.accent && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />}
            {item.label}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300, fontSize: '1.8rem', lineHeight: 1,
            color: item.accent ? 'var(--red)' : 'var(--ink)',
          }}>
            {item.value}
          </div>
          {item.trend && (
            <div style={{ fontSize: '.38rem', letterSpacing: '.1em', color: '#2E7D32', fontWeight: 500, marginTop: '2px' }}>
              {item.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/KpiStrip.tsx
git commit -m "feat: KpiStrip — bande KPI unifiée 4 cellules"
```

---

## Task 3 — SkeletonCard

**Files:**
- Create: `src/components/admin/SkeletonCard.tsx`

- [ ] **Créer le composant**

```tsx
// SkeletonCard — shimmer loader, remplace le spinner générique pendant le chargement.
export function SkeletonCard() {
  const sk: React.CSSProperties = {
    background: 'linear-gradient(90deg, #EDE7DC 25%, rgba(237,231,220,.6) 50%, #EDE7DC 75%)',
    backgroundSize: '600px 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius: '3px',
  }
  return (
    <div style={{
      background: '#EDE7DC', border: '1px solid rgba(26,20,16,.07)',
      borderRadius: '1.1rem', padding: '3px',
      boxShadow: '0 1px 0 rgba(255,255,255,.65) inset, var(--shadow-card)',
    }}>
      <div style={{ background: '#fff', borderRadius: 'calc(1.1rem - 3px)', overflow: 'hidden' }}>
        {/* Photo zone */}
        <div style={{ ...sk, height: '110px', borderRadius: 0 }} />
        {/* Footer */}
        <div style={{ padding: '.5rem .6rem .48rem', borderTop: '1px solid rgba(26,20,16,.07)', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          <div style={{ ...sk, height: '9px', width: '70%' }} />
          <div style={{ ...sk, height: '7px', width: '50%' }} />
          <div style={{ ...sk, height: '7px', width: '40%' }} />
          <div style={{ display: 'flex', gap: '.22rem' }}>
            <div style={{ ...sk, height: '14px', width: '40px', borderRadius: '100px' }} />
            <div style={{ ...sk, height: '14px', width: '34px', borderRadius: '100px' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/SkeletonCard.tsx
git commit -m "feat: SkeletonCard — shimmer loader"
```

---

## Task 4 — AdminNav (pill flottante)

**Files:**
- Create: `src/components/admin/AdminNav.tsx`

- [ ] **Créer le composant**

```tsx
// AdminNav — pill flottante ink detachée du bord. Remplace la nav sticky collée en haut.
'use client'

interface Props {
  newCount:       number
  onRefresh:      () => void
  onExportCSV:    () => void
  onLogout:       () => void
  onNewSession:   () => void
  loading:        boolean
}

export function AdminNav({ newCount, onRefresh, onExportCSV, onLogout, onNewSession, loading }: Props) {
  return (
    <div style={{ padding: '.8rem .8rem 0', position: 'sticky', top: '.8rem', zIndex: 40 }}>
      <nav style={{
        background: '#1A1410',
        borderRadius: '100px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 .45rem',
        gap: '.1rem',
        boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 2px 8px rgba(26,20,16,.18), 0 1px 2px rgba(26,20,16,.12)',
      }}>
        {/* Logo */}
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic', fontWeight: 300,
          fontSize: '.85rem', letterSpacing: '.16em',
          color: 'rgba(247,243,238,.92)', padding: '0 .65rem', flexShrink: 0,
        }}>
          Lumina
        </span>

        {/* Séparateur */}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,.1)', flexShrink: 0, margin: '0 .2rem' }} />

        {/* Liens */}
        <div style={{ display: 'flex', gap: '.05rem', flex: 1 }}>
          {[
            { label: 'Modèles', href: '/admin/dashboard' },
            { label: 'Sessions', href: '/admin/sessions' },
            { label: 'Factures', href: '#' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{
                height: 30, borderRadius: '100px', padding: '0 .7rem',
                display: 'flex', alignItems: 'center',
                fontSize: '.44rem', letterSpacing: '.15em', fontWeight: 500,
                textTransform: 'uppercase', textDecoration: 'none',
                color: link.href === '/admin/dashboard' ? 'rgba(247,243,238,.95)' : 'rgba(247,243,238,.35)',
                background: link.href === '/admin/dashboard' ? 'rgba(255,255,255,.11)' : 'transparent',
                transition: 'all .3s var(--spring)',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginLeft: 'auto', flexShrink: 0, paddingRight: '.1rem' }}>
          {/* Cloche avec badge */}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', opacity: loading ? .5 : 1, transition: 'opacity .2s' }}
            aria-label="Rafraîchir"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(247,243,238,.5)" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {newCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--red)', border: '1.5px solid #1A1410',
                fontSize: '.3rem', fontWeight: 500, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {newCount > 9 ? '9+' : newCount}
              </span>
            )}
          </button>

          {/* CTA Session */}
          <button
            onClick={onNewSession}
            style={{
              height: 30, borderRadius: '100px', padding: '0 .45rem 0 .7rem',
              background: 'var(--red)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '.35rem',
              boxShadow: '0 1px 6px rgba(139,0,32,.35), 0 1px 0 rgba(255,255,255,.15) inset',
              transition: 'transform .25s var(--spring-fast)',
            }}
          >
            <span style={{ fontSize: '.44rem', letterSpacing: '.14em', fontWeight: 500, textTransform: 'uppercase', color: '#fff' }}>
              Session
            </span>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', color: '#fff', fontWeight: 200, lineHeight: 1 }}>
              +
            </span>
          </button>
        </div>
      </nav>
    </div>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/AdminNav.tsx
git commit -m "feat: AdminNav — pill flottante ink"
```

---

## Task 5 — FiltersDrawer

**Files:**
- Create: `src/components/admin/FiltersDrawer.tsx`

- [ ] **Créer le composant**

```tsx
// FiltersDrawer — drawer filtres avancés, slide-up depuis le bas.
// Contient : taille, dispo, expérience, tier, tag, instagram, ville.
'use client'

import { useEffect } from 'react'
import type { SortKey } from '@/types/candidature'
import { TIER_CONFIG, type Tier } from '@/components/admin/tierConfig'

interface Props {
  open:                   boolean
  onClose:                () => void
  tailleMin:              string
  tailleMax:              string
  onTailleMin:            (v: string) => void
  onTailleMax:            (v: string) => void
  filterDisponibilite:    string | null
  onFilterDisponibilite:  (v: string | null) => void
  filterExperience:       string | null
  onFilterExperience:     (v: string | null) => void
  filterTier:             string | null
  onFilterTier:           (v: string | null) => void
  filterTag:              string | null
  onFilterTag:            (v: string | null) => void
  filterInstagram:        boolean
  onFilterInstagram:      (v: boolean) => void
  filterVille:            string
  onFilterVille:          (v: string) => void
  allTags:                string[]
  onResetAll:             () => void
  hasActiveFilters:       boolean
}

const DISPONIBILITES = ['Immédiatement', 'Dans 1 mois', 'Dans 3 mois', 'Selon disponibilité']
const EXPERIENCES    = ['Débutant', 'Intermédiaire', 'Professionnel']

function DrawerChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: '24px', borderRadius: '100px', padding: '0 .65rem',
        fontSize: '.46rem', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
        background: active ? 'var(--ink)' : '#fff',
        color: active ? 'var(--paper)' : 'var(--ink)',
        cursor: 'pointer',
        transition: 'all .25s var(--spring)',
      }}
    >
      {label}
    </button>
  )
}

function DrawerInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: '30px', borderRadius: '.55rem', border: '1px solid var(--border)',
          background: 'var(--paper)', padding: '0 .6rem',
          fontSize: '.52rem', color: 'var(--ink)', outline: 'none',
          fontFamily: "'Montserrat', sans-serif",
        }}
      />
    </div>
  )
}

export function FiltersDrawer({
  open, onClose,
  tailleMin, tailleMax, onTailleMin, onTailleMax,
  filterDisponibilite, onFilterDisponibilite,
  filterExperience, onFilterExperience,
  filterTier, onFilterTier,
  filterTag, onFilterTag,
  filterInstagram, onFilterInstagram,
  filterVille, onFilterVille,
  allTags, onResetAll, hasActiveFilters,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(26,20,16,.25)' }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 46,
        background: 'var(--paper)',
        borderRadius: '1.25rem 1.25rem 0 0',
        padding: '1.5rem 1.5rem 2rem',
        boxShadow: '0 -8px 32px rgba(26,20,16,.12)',
        animation: 'drawerUp .35s var(--spring)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto .75rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 300 }}>Filtres avancés</span>
          {hasActiveFilters && (
            <button type="button" onClick={onResetAll} style={{ fontSize: '.46rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Tout réinitialiser
            </button>
          )}
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Taille */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.5rem' }}>Taille (cm)</div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <DrawerInput label="Min" value={tailleMin} onChange={onTailleMin} placeholder="165" />
              <DrawerInput label="Max" value={tailleMax} onChange={onTailleMax} placeholder="185" />
            </div>
          </div>

          {/* Disponibilité */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.5rem' }}>Disponibilité</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {DISPONIBILITES.map(d => (
                <DrawerChip key={d} label={d} active={filterDisponibilite === d} onClick={() => onFilterDisponibilite(filterDisponibilite === d ? null : d)} />
              ))}
            </div>
          </div>

          {/* Expérience */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.5rem' }}>Expérience</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {EXPERIENCES.map(exp => (
                <DrawerChip key={exp} label={exp} active={filterExperience === exp} onClick={() => onFilterExperience(filterExperience === exp ? null : exp)} />
              ))}
            </div>
          </div>

          {/* Tier */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.5rem' }}>Tier</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {(Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG[Tier]][]).map(([key, cfg]) => (
                <DrawerChip key={key} label={cfg.label} active={filterTier === key} onClick={() => onFilterTier(filterTier === key ? null : key)} />
              ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.5rem' }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                {allTags.map(tag => (
                  <DrawerChip key={tag} label={tag} active={filterTag === tag} onClick={() => onFilterTag(filterTag === tag ? null : tag)} />
                ))}
              </div>
            </div>
          )}

          {/* Ville */}
          <DrawerInput label="Ville" value={filterVille} onChange={onFilterVille} placeholder="Montréal" />

          {/* Instagram */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterInstagram}
              onChange={e => onFilterInstagram(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '.5rem', letterSpacing: '.1em', fontWeight: 400, color: 'var(--ink)' }}>Instagram uniquement</span>
          </label>

        </div>

        {/* CTA Fermer */}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '1.5rem', width: '100%', height: '40px', borderRadius: '100px',
            background: 'var(--ink)', color: 'var(--paper)', border: 'none', cursor: 'pointer',
            fontSize: '.48rem', letterSpacing: '.18em', fontWeight: 500, textTransform: 'uppercase',
          }}
        >
          Appliquer
        </button>
      </div>
    </>
  )
}
```

- [ ] **Ajouter l'animation `drawerUp` dans globals.css** (après `@keyframes shimmer`)

```css
@keyframes drawerUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/FiltersDrawer.tsx src/app/globals.css
git commit -m "feat: FiltersDrawer — drawer filtres avancés"
```

---

## Task 6 — DashboardFilters refonte

**Files:**
- Modify: `src/components/admin/DashboardFilters.tsx`

- [ ] **Remplacer le contenu entier du fichier**

```tsx
// DashboardFilters — barre recherche + chips simples + chip Tri + trigger drawer.
// Les filtres avancés sont dans FiltersDrawer.
'use client'

import { useState } from 'react'
import type { SortKey } from '@/types/candidature'
import { FiltersDrawer } from '@/components/admin/FiltersDrawer'
import { TIER_CONFIG, type Tier } from '@/components/admin/tierConfig'

const SORT_LABELS: Record<SortKey, string> = {
  date:   'Date',
  nom:    'Nom',
  taille: 'Taille',
  age:    'Âge',
}
const SORT_CYCLE: SortKey[] = ['date', 'nom', 'taille', 'age']

interface Props {
  search:                 string
  onSearch:               (v: string) => void
  filterGenre:            string | null
  onFilterGenre:          (g: string | null) => void
  filterSelectionne:      boolean
  onFilterSelectionne:    (v: boolean) => void
  sortBy:                 SortKey
  sortAsc:                boolean
  onSort:                 (key: SortKey) => void
  filteredCount:          number
  totalCount:             number
  hasActiveFilters:       boolean
  onResetFilters:         () => void
  // Drawer props
  tailleMin:              string
  tailleMax:              string
  onTailleMin:            (v: string) => void
  onTailleMax:            (v: string) => void
  filterDisponibilite:    string | null
  onFilterDisponibilite:  (v: string | null) => void
  filterExperience:       string | null
  onFilterExperience:     (v: string | null) => void
  filterTier:             string | null
  onFilterTier:           (v: string | null) => void
  filterTag:              string | null
  onFilterTag:            (v: string | null) => void
  filterInstagram:        boolean
  onFilterInstagram:      (v: boolean) => void
  filterVille:            string
  onFilterVille:          (v: string) => void
  allTags:                string[]
}

function Chip({ label, active, onClick, variant = 'default' }: { label: string; active: boolean; onClick: () => void; variant?: 'default' | 'rouge' | 'dashed' }) {
  const bg    = active ? (variant === 'rouge' ? 'var(--red)' : 'var(--ink)') : '#fff'
  const color = active ? 'var(--paper)' : 'var(--ink)'
  const border = variant === 'dashed'
    ? `1px dashed var(--border)`
    : `1px solid ${active ? (variant === 'rouge' ? 'var(--red)' : 'var(--ink)') : 'rgba(26,20,16,.12)'}`
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: '22px', borderRadius: '100px', padding: '0 .6rem', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '.28rem',
        fontSize: '.44rem', fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase',
        border, background: variant === 'dashed' ? 'transparent' : bg,
        color: variant === 'dashed' ? 'var(--muted)' : color,
        cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
        transition: 'all .3s var(--spring)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

export function DashboardFilters({
  search, onSearch,
  filterGenre, onFilterGenre,
  filterSelectionne, onFilterSelectionne,
  sortBy, sortAsc, onSort,
  filteredCount, totalCount,
  hasActiveFilters, onResetFilters,
  tailleMin, tailleMax, onTailleMin, onTailleMax,
  filterDisponibilite, onFilterDisponibilite,
  filterExperience, onFilterExperience,
  filterTier, onFilterTier,
  filterTag, onFilterTag,
  filterInstagram, onFilterInstagram,
  filterVille, onFilterVille,
  allTags,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  function cycleSortBy() {
    const idx  = SORT_CYCLE.indexOf(sortBy)
    const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]
    onSort(next)
  }

  const hasDrawerFilters = !!(tailleMin || tailleMax || filterDisponibilite || filterExperience || filterTier || filterTag || filterInstagram || filterVille)

  return (
    <>
      <div style={{ padding: '0 .8rem .6rem', display: 'flex', flexDirection: 'column', gap: '.45rem' }}>

        {/* Search bar */}
        <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid rgba(26,20,16,.12)', padding: '3px', boxShadow: '0 1px 0 rgba(255,255,255,.9) inset, var(--shadow-card)' }}>
          <div style={{ background: 'var(--paper)', borderRadius: 'calc(1rem - 3px)', display: 'flex', alignItems: 'center', padding: '.45rem .65rem', gap: '.5rem', boxShadow: '0 1px 2px rgba(26,20,16,.05) inset' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Rechercher, filtrer, naviguer…"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '.58rem', letterSpacing: '.1em', fontWeight: 300, color: 'var(--ink)', fontFamily: "'Montserrat', sans-serif" }}
            />
            <span style={{ fontSize: '.44rem', fontWeight: 500, color: 'var(--muted)', background: 'var(--cream-deep, #EDE7DC)', border: '1px solid rgba(26,20,16,.12)', borderRadius: '3px', padding: '2px 5px', flexShrink: 0 }}>
              ⌘K
            </span>
          </div>
        </div>

        {/* Chips row */}
        <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {/* Tous / count */}
          <Chip
            label={`Tous (${filteredCount})`}
            active={!filterGenre && !filterSelectionne}
            onClick={() => { onFilterGenre(null); onFilterSelectionne(false) }}
          />

          {/* Sélectionnés */}
          <Chip
            label="● Sélect."
            active={filterSelectionne}
            onClick={() => onFilterSelectionne(!filterSelectionne)}
            variant="rouge"
          />

          {/* Séparateur */}
          <div style={{ width: 1, height: 14, background: 'rgba(26,20,16,.12)', flexShrink: 0 }} />

          {/* Genre */}
          <Chip label="Femmes" active={filterGenre === 'Femme'}   onClick={() => onFilterGenre(filterGenre === 'Femme'   ? null : 'Femme')} />
          <Chip label="Hommes" active={filterGenre === 'Homme'}   onClick={() => onFilterGenre(filterGenre === 'Homme'   ? null : 'Homme')} />

          {/* Séparateur */}
          <div style={{ width: 1, height: 14, background: 'rgba(26,20,16,.12)', flexShrink: 0 }} />

          {/* Tri chip */}
          <Chip
            label={`Tri : ${SORT_LABELS[sortBy]} ${sortAsc ? '↑' : '↓'}`}
            active={sortBy !== 'date' || sortAsc}
            onClick={cycleSortBy}
          />

          {/* Filtres avancés */}
          <Chip
            label={hasDrawerFilters ? `+ Filtres (${[tailleMin||tailleMax,filterDisponibilite,filterExperience,filterTier,filterTag,filterInstagram||'',filterVille].filter(Boolean).length})` : '+ Filtres avancés'}
            active={hasDrawerFilters}
            onClick={() => setDrawerOpen(true)}
            variant="dashed"
          />

          {/* Reset si filtres actifs */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              style={{ fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 .2rem' }}
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tailleMin={tailleMin}           onTailleMin={onTailleMin}
        tailleMax={tailleMax}           onTailleMax={onTailleMax}
        filterDisponibilite={filterDisponibilite} onFilterDisponibilite={onFilterDisponibilite}
        filterExperience={filterExperience}       onFilterExperience={onFilterExperience}
        filterTier={filterTier}                   onFilterTier={onFilterTier}
        filterTag={filterTag}                     onFilterTag={onFilterTag}
        filterInstagram={filterInstagram}         onFilterInstagram={onFilterInstagram}
        filterVille={filterVille}                 onFilterVille={onFilterVille}
        allTags={allTags}
        onResetAll={onResetFilters}
        hasActiveFilters={hasDrawerFilters}
      />
    </>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/DashboardFilters.tsx
git commit -m "refactor: DashboardFilters — chips + tri + drawer avancés"
```

---

## Task 7 — CandidatureCard refonte

**Files:**
- Modify: `src/components/admin/CandidatureCard.tsx`

- [ ] **Remplacer le contenu entier**

```tsx
// CandidatureCard — double-bezel, info B (dispo+tags), Ambassadeur dark+or, sélection outline.
'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { Candidature } from '@/types/candidature'
import { TIER_CONFIG, type Tier } from '@/components/admin/tierConfig'

interface Props {
  c:            Candidature
  selected:     boolean
  isDuplicate?: boolean
  onToggle:     (id: string) => void
  onViewDetail: (c: Candidature) => void
  onTierChange: (id: string, tier: Tier | null) => void
  style?:       React.CSSProperties  // permet grid-row:span 2 depuis page.tsx
}

const TAGS_MAP: Record<string, string[]> = {
  // ponytail: mapping tag → display label, extensible via c.tags
}

function DispoTag({ dispo }: { dispo: string | null | undefined }) {
  if (!dispo) return null
  const isAvail = dispo === 'Immédiatement'
  const color   = isAvail ? '#2E7D32' : '#F59E0B'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.4rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--muted)', marginTop: '.3rem' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      {isAvail ? 'Disponible' : 'À confirmer'}
    </div>
  )
}

function TagPill({ label, variant = 'rouge' }: { label: string; variant?: 'rouge' | 'neutral' | 'gold' }) {
  const styles: Record<string, React.CSSProperties> = {
    rouge:   { background: 'rgba(139,0,32,.07)',   color: 'var(--red)',   border: '1px solid rgba(139,0,32,.16)' },
    neutral: { background: 'var(--paper)',          color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)' },
    gold:    { background: 'rgba(196,151,58,.1)',   color: '#C4973A',      border: '1px solid rgba(196,151,58,.28)' },
  }
  return (
    <span style={{ fontSize: '.38rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', padding: '1.5px 5px', borderRadius: '100px', ...styles[variant] }}>
      {label}
    </span>
  )
}

export function CandidatureCard({ c, selected, isDuplicate = false, onToggle, onViewDetail, onTierChange }: Props) {
  const [hovered,  setHovered]  = useState(false)
  const [tierOpen, setTierOpen] = useState(false)
  const tierRef = useRef<HTMLDivElement>(null)
  const isAmb   = c.tier === 'ambassadeur'

  useEffect(() => {
    if (!tierOpen) return
    function close(e: MouseEvent) {
      if (tierRef.current && !tierRef.current.contains(e.target as Node)) setTierOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [tierOpen])

  const activeSrc = hovered && c.photo_body_signed ? c.photo_body_signed : c.photo_profil_signed
  const tags      = (c.tags ?? []).slice(0, 2)

  // Outer shell — varie selon tier Ambassadeur et sélection
  const outerStyle: React.CSSProperties = isAmb ? {
    background: '#1A1410',
    border: `1px solid ${selected ? '#C4973A' : 'rgba(196,151,58,.3)'}`,
    borderRadius: '1.1rem',
    padding: '3px',
    boxShadow: selected
      ? '0 1px 0 rgba(255,255,255,.06) inset, 0 0 0 2.5px rgba(196,151,58,.35), 0 2px 8px rgba(26,20,16,.18)'
      : '0 1px 0 rgba(255,255,255,.06) inset, 0 2px 8px rgba(26,20,16,.18), 0 0 0 1px rgba(196,151,58,.12)',
    cursor: 'pointer',
    transition: 'transform .35s var(--spring), box-shadow .35s var(--spring)',
  } : {
    background: '#EDE7DC',
    border: `1px solid ${selected ? 'var(--red)' : 'rgba(26,20,16,.07)'}`,
    borderRadius: '1.1rem',
    padding: '3px',
    boxShadow: selected
      ? '0 1px 0 rgba(255,255,255,.65) inset, 0 0 0 2.5px rgba(139,0,32,.2), var(--shadow-card)'
      : '0 1px 0 rgba(255,255,255,.65) inset, var(--shadow-card)',
    cursor: 'pointer',
    transition: 'transform .35s var(--spring), box-shadow .35s var(--spring)',
  }

  const innerStyle: React.CSSProperties = isAmb ? {
    background: selected ? 'rgba(139,0,32,.025)' : '#1A1410',
    borderRadius: 'calc(1.1rem - 3px)',
    overflow: 'hidden',
  } : {
    background: selected ? 'rgba(139,0,32,.025)' : '#fff',
    borderRadius: 'calc(1.1rem - 3px)',
    overflow: 'hidden',
    boxShadow: '0 1px 0 rgba(255,255,255,.9) inset',
  }

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onToggle(c.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(c.id) } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...outerStyle, ...props.style }}
    >
      <div style={innerStyle}>

        {/* Photo */}
        <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3/4' }}>
          {activeSrc ? (
            <Image
              src={activeSrc}
              alt={`${c.prenom} ${c.nom}`}
              fill
              className="object-cover object-top"
              style={{ transition: 'opacity .3s' }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isAmb ? 'linear-gradient(155deg,#2A1F16,#0D0A08)' : 'linear-gradient(155deg,#C5B9AF,#7A6E66)' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: isAmb ? 'rgba(196,151,58,.3)' : 'rgba(139,0,32,.18)' }}>
                {c.prenom[0]}{c.nom[0]}
              </span>
            </div>
          )}

          {/* Tier badge top-right */}
          {c.tier && (
            <div style={{
              position: 'absolute', top: 7, right: 7,
              height: 16, borderRadius: '100px', padding: '0 7px',
              fontSize: '.4rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center',
              ...(isAmb
                ? { background: 'linear-gradient(90deg,#C4973A,#E8C97A)', color: '#1A1410' }
                : { background: 'rgba(139,0,32,.88)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }
              ),
            }}>
              {isAmb ? '✦ ' : ''}{TIER_CONFIG[c.tier as Tier]?.label ?? c.tier}
            </div>
          )}

          {/* Nouveau badge si pas de tier */}
          {!c.tier && c.date_inscription && (() => {
            const days = (Date.now() - new Date(c.date_inscription).getTime()) / 86400000
            return days < 7 ? (
              <div style={{ position: 'absolute', top: 7, right: 7, height: 16, borderRadius: '100px', padding: '0 7px', fontSize: '.4rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', background: 'rgba(247,243,238,.84)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,.5)' }}>
                Nouveau
              </div>
            ) : null
          })()}

          {/* Select dot top-left */}
          <div style={{
            position: 'absolute', top: 8, left: 8,
            width: 20, height: 20, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: selected ? (isAmb ? '#C4973A' : 'var(--red)') : 'rgba(247,243,238,.25)',
            border: selected ? `1.5px solid #fff` : `1.5px solid rgba(255,255,255,.5)`,
            boxShadow: selected ? (isAmb ? '0 2px 6px rgba(196,151,58,.4)' : '0 2px 6px rgba(139,0,32,.35)') : 'none',
            transition: 'all .2s var(--spring)',
          }}>
            {selected && (
              <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          {/* Doublon badge */}
          {isDuplicate && (
            <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '.34rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', background: 'rgba(200,100,0,.85)', color: '#fff', padding: '.18rem .4rem', borderRadius: '3px' }}>
              Doublon
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '.5rem .6rem .48rem',
          borderTop: `1px solid ${isAmb ? 'rgba(196,151,58,.18)' : 'rgba(26,20,16,.07)'}`,
          position: 'relative',
        }}>
          {/* Ligne or Ambassadeur */}
          {isAmb && (
            <div style={{ position: 'absolute', top: 0, left: '1rem', right: '1rem', height: 1, background: 'linear-gradient(to right,transparent,#C4973A,transparent)', opacity: .45 }} />
          )}

          {/* Tier dropdown inline */}
          <div ref={tierRef} style={{ position: 'relative', marginBottom: '.35rem' }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setTierOpen(v => !v) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase',
                color: isAmb ? '#C4973A' : 'var(--muted)',
              }}
            >
              {c.tier ? `${isAmb ? '✦ ' : ''}${TIER_CONFIG[c.tier as Tier]?.label ?? c.tier}` : '+ Tier'}
            </button>
            {tierOpen && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 50, background: 'var(--paper)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,.1)', minWidth: '110px', marginBottom: 4, borderRadius: '.5rem' }}>
                {(Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG[Tier]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={e => { e.stopPropagation(); onTierChange(c.id, key); setTierOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.4rem .7rem', fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 600, color: cfg.color, background: c.tier === key ? cfg.bg : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    {cfg.label} {c.tier === key ? '✓' : ''}
                  </button>
                ))}
                {c.tier && <button type="button" onClick={e => { e.stopPropagation(); onTierChange(c.id, null); setTierOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.4rem .7rem', fontSize: '.4rem', letterSpacing: '.1em', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Retirer</button>}
              </div>
            )}
          </div>

          {/* Nom */}
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: '.9rem', letterSpacing: '.02em', color: isAmb ? 'rgba(247,243,238,.95)' : 'var(--ink)', lineHeight: 1.1, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.prenom} {c.nom}
          </div>

          {/* Meta */}
          <div style={{ fontSize: '.4rem', letterSpacing: '.13em', fontWeight: 400, color: isAmb ? 'rgba(155,143,132,.65)' : 'var(--muted)', textTransform: 'uppercase', marginBottom: 0 }}>
            {[c.taille && `${c.taille} cm`, c.genre, c.ville].filter(Boolean).join(' · ')}
          </div>

          {/* Disponibilité */}
          <DispoTag dispo={c.disponibilite} />

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '.22rem', flexWrap: 'wrap', marginTop: '.3rem' }}>
              {tags.map(tag => (
                <TagPill key={tag} label={tag} variant={isAmb ? 'gold' : 'rouge'} />
              ))}
            </div>
          )}

          {/* Voir détail */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onViewDetail(c) }}
            style={{ position: 'absolute', bottom: '.5rem', right: '.6rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', color: isAmb ? 'rgba(196,151,58,.6)' : 'var(--muted)', lineHeight: 1, padding: '.2rem' }}
            aria-label="Voir le profil"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/CandidatureCard.tsx
git commit -m "refactor: CandidatureCard — double-bezel, info B, Ambassadeur, sélection outline"
```

---

## Task 8 — FloatingBar refonte

**Files:**
- Modify: `src/components/admin/FloatingBar.tsx`

- [ ] **Remplacer le contenu entier**

```tsx
// FloatingBar — spring up/down, thumbnails empilés, layout ink mat.
'use client'

import { useEffect, useState } from 'react'
import type { Candidature } from '@/types/candidature'

interface Props {
  selectedCount:     number
  selectedBreakdown: string
  selectedItems:     Candidature[]
  notifying:         boolean
  confirmNotify:     boolean
  onClearSelection:  () => void
  onRequestNotify:   () => void
  onConfirmNotify:   () => void
  onCancelNotify:    () => void
  onComposeSession:  () => void
  onCopyList:        () => void
}

export function FloatingBar({
  selectedCount, selectedBreakdown, selectedItems,
  notifying, confirmNotify,
  onClearSelection, onRequestNotify, onConfirmNotify, onCancelNotify, onComposeSession, onCopyList,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Spring delay pour l'animation d'apparition
    if (selectedCount > 0) setVisible(true)
    else {
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [selectedCount])

  if (!visible) return null

  const thumbs = selectedItems.slice(0, 4)

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', zIndex: 50,
        background: '#1A1410',
        borderRadius: '1.1rem',
        height: 52,
        display: 'flex', alignItems: 'center',
        padding: '0 .65rem', gap: '.6rem',
        boxShadow: '0 -1px 0 rgba(255,255,255,.07) inset, 0 8px 28px rgba(26,20,16,.22), 0 2px 8px rgba(26,20,16,.14)',
        animation: selectedCount > 0
          ? 'barUp .45s var(--spring) both'
          : 'barDown .3s var(--spring) both',
      }}
    >
      {/* Thumbnails empilés */}
      {thumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {thumbs.map((item, i) => (
            <div
              key={item.id}
              style={{
                width: 28, height: 36, borderRadius: '.45rem',
                border: '2px solid #1A1410',
                marginRight: i < thumbs.length - 1 ? -8 : 0,
                zIndex: thumbs.length - i,
                overflow: 'hidden',
                background: item.photo_profil_signed ? undefined : 'linear-gradient(155deg,#C5B9AF,#7A6E66)',
                position: 'relative', flexShrink: 0,
                boxShadow: '0 1px 3px rgba(26,20,16,.3)',
              }}
            >
              {item.photo_profil_signed && (
                <img src={item.photo_profil_signed} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Séparateur */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />

      {/* Compteur */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1.3rem', lineHeight: 1, color: 'rgba(247,243,238,.95)' }}>
          {selectedCount}
        </div>
        <div style={{ fontSize: '.38rem', letterSpacing: '.14em', fontWeight: 500, textTransform: 'uppercase', color: 'rgba(247,243,238,.4)' }}>
          sélectionnée{selectedCount > 1 ? 's' : ''}
        </div>
      </div>

      {/* Séparateur */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '.3rem', flex: 1 }}>
        {confirmNotify ? (
          <>
            <button
              onClick={onConfirmNotify}
              disabled={notifying}
              style={{ height: 32, borderRadius: '100px', padding: '0 .65rem 0 .8rem', background: 'var(--red)', color: '#fff', border: '1px solid var(--red)', display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: notifying ? 'not-allowed' : 'pointer', opacity: notifying ? .5 : 1, boxShadow: '0 1px 8px rgba(139,0,32,.4)', whiteSpace: 'nowrap' }}
            >
              {notifying ? 'Envoi…' : `Confirmer — ${selectedCount}`}
            </button>
            {!notifying && (
              <button onClick={onCancelNotify} style={{ height: 32, borderRadius: '100px', padding: '0 .65rem', background: 'rgba(255,255,255,.08)', color: 'rgba(247,243,238,.7)', border: '1px solid rgba(255,255,255,.1)', fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Annuler
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onComposeSession}
              style={{ height: 32, borderRadius: '100px', padding: '0 .45rem 0 .8rem', background: 'var(--red)', color: '#fff', border: '1px solid var(--red)', display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 1px 8px rgba(139,0,32,.4)', whiteSpace: 'nowrap' }}
            >
              + Session
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem' }}>›</span>
            </button>
            <button
              onClick={onRequestNotify}
              style={{ height: 32, borderRadius: '100px', padding: '0 .65rem', background: 'rgba(255,255,255,.08)', color: 'rgba(247,243,238,.7)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ✉ Notifier
            </button>
            <button
              onClick={onCopyList}
              style={{ height: 32, borderRadius: '100px', padding: '0 .65rem', background: 'rgba(255,255,255,.08)', color: 'rgba(247,243,238,.7)', border: '1px solid rgba(255,255,255,.1)', fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ⎘ Copier
            </button>
          </>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={onClearSelection}
        style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 'auto', color: 'rgba(247,243,238,.4)', fontSize: '.7rem' }}
        aria-label="Effacer la sélection"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Ajouter l'animation `barDown` dans globals.css** (après `@keyframes barUp`)

```css
@keyframes barUp {
  from { opacity: 0; transform: translateY(16px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes barDown {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(16px) scale(.97); }
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/FloatingBar.tsx src/app/globals.css
git commit -m "refactor: FloatingBar — thumbnails, spring barUp/Down, layout ink"
```

---

## Task 9 — DetailPanel refonte

**Files:**
- Modify: `src/components/admin/DetailPanel.tsx`

La refonte est large — lire le fichier existant avant de modifier pour préserver la logique d'édition inline et de session.

- [ ] **Lire le fichier existant**

```bash
cat src/components/admin/DetailPanel.tsx
```

- [ ] **Remplacer uniquement le wrapper de layout et l'en-tête** — conserver la logique métier (handleEdit, handleArchive, handleDelete, handleTierChange, handleSendSession) et ne changer que la structure visuelle.

Chercher dans DetailPanel.tsx la div racine et remplacer par :

```tsx
// Slide-in depuis la droite, largeur fixe 320px
<div
  style={{
    width: 320, flexShrink: 0,
    background: '#EDE7DC',
    border: '1px solid rgba(26,20,16,.12)',
    borderRadius: '1.25rem',
    padding: '4px',
    boxShadow: '0 1px 0 rgba(255,255,255,.55) inset, 0 2px 8px rgba(26,20,16,.07)',
    display: 'flex', flexDirection: 'column',
    animation: 'panelIn .45s var(--spring) both',
    overflow: 'hidden',
  }}
>
  <div style={{ background: '#fff', borderRadius: 'calc(1.25rem - 4px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 1px 0 rgba(255,255,255,.9) inset' }}>
    {/* … contenu existant relogé ici … */}
  </div>
</div>
```

- [ ] **Ajouter `panelIn` keyframe dans globals.css**

```css
@keyframes panelIn {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

- [ ] **Remplacer la section photo** par la version avec dots et close button :

```tsx
{/* Photo zone */}
<div style={{ position: 'relative', overflow: 'hidden', height: 160 }}>
  {/* Image existante conservée */}
  {/* Close button */}
  <button
    onClick={onClose}
    style={{ position: 'absolute', top: 7, right: 7, zIndex: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(247,243,238,.2)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.46rem', color: 'rgba(247,243,238,.8)', cursor: 'pointer' }}
    aria-label="Fermer"
  >✕</button>
  {/* Badge tier */}
  {detail.tier === 'ambassadeur' && (
    <div style={{ position: 'absolute', bottom: 8, left: 7, zIndex: 2, height: 16, borderRadius: '100px', padding: '0 7px', fontSize: '.38rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', background: 'linear-gradient(90deg,#C4973A,#E8C97A)', color: '#1A1410' }}>
      ✦ Ambassadeur
    </div>
  )}
</div>
```

- [ ] **Remplacer le header identité** :

```tsx
<div style={{ padding: '.6rem .7rem .45rem', borderBottom: '1px solid rgba(26,20,16,.07)' }}>
  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: '1.05rem', letterSpacing: '.02em', color: 'var(--ink)', marginBottom: 2 }}>
    {detail.prenom} {detail.nom}
  </div>
  <div style={{ fontSize: '.4rem', letterSpacing: '.13em', fontWeight: 400, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '.38rem' }}>
    {[detail.taille && `${detail.taille} cm`, detail.genre, detail.ville, detail.date_naissance && `${new Date().getFullYear() - new Date(detail.date_naissance).getFullYear()} ans`].filter(Boolean).join(' · ')}
  </div>
  {/* Pills dispo + tags */}
  <div style={{ display: 'flex', gap: '.22rem', flexWrap: 'wrap' }}>
    {detail.disponibilite && (
      <span style={{ height: 15, borderRadius: '100px', padding: '0 6px', fontSize: '.32rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '.22rem', background: 'rgba(46,125,50,.08)', color: '#2E7D32', border: '1px solid rgba(46,125,50,.18)' }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2E7D32', display: 'inline-block' }} />
        Disponible
      </span>
    )}
    {(detail.tags ?? []).slice(0,2).map(tag => (
      <span key={tag} style={{ height: 15, borderRadius: '100px', padding: '0 5px', fontSize: '.32rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)' }}>
        {tag}
      </span>
    ))}
  </div>
</div>
```

- [ ] **Ajouter tab bar** entre header et contenu :

```tsx
{/* Tabs */}
<div style={{ display: 'flex', borderBottom: '1px solid rgba(26,20,16,.07)', padding: '0 .5rem' }}>
  {(['Infos', 'Mesures', 'Sessions'] as const).map(tab => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab)}
      style={{ flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', color: activeTab === tab ? 'var(--ink)' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
    >
      {tab}
      {activeTab === tab && <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 1.5, background: 'var(--red)', borderRadius: 1 }} />}
    </button>
  ))}
</div>
```

Ajouter `const [activeTab, setActiveTab] = useState<'Infos'|'Mesures'|'Sessions'>('Infos')` dans le composant.

- [ ] **Remplacer les actions en bas** par le layout sticky :

```tsx
{/* Actions sticky */}
<div style={{ display: 'flex', gap: '.28rem', padding: '.45rem .7rem .55rem', borderTop: '1px solid rgba(26,20,16,.07)', background: '#fff', flexShrink: 0 }}>
  <button
    type="button"
    onClick={() => { onToggleSelectionne(detail.id) }}
    style={{ flex: 1, height: 26, borderRadius: '100px', background: detail.selectionne ? 'var(--red)' : 'var(--paper)', color: detail.selectionne ? '#fff' : 'var(--ink)', border: `1px solid ${detail.selectionne ? 'var(--red)' : 'rgba(26,20,16,.12)'}`, fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer', boxShadow: detail.selectionne ? '0 1px 5px rgba(139,0,32,.28)' : undefined }}
  >
    {detail.selectionne ? '✓ Sélect.' : 'Sélectionner'}
  </button>
  <button type="button" onClick={() => onComposeSession?.([detail])} style={{ flex: 1, height: 26, borderRadius: '100px', background: 'var(--paper)', color: 'var(--ink)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}>
    + Session
  </button>
  <button type="button" onClick={() => setEditing(true)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    ✏
  </button>
</div>
```

Note : `onToggleSelectionne` et `onComposeSession` doivent être ajoutés aux Props de DetailPanel si absent.

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/admin/DetailPanel.tsx src/app/globals.css
git commit -m "refactor: DetailPanel — slide-in, tabs, header luxe, actions sticky"
```

---

## Task 10 — dashboard/page.tsx — layout final

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`

- [ ] **Remplacer les imports en haut du fichier**

Ajouter les nouveaux imports (conserver les existants) :

```tsx
import { AdminNav }    from '@/components/admin/AdminNav'
import { KpiStrip }    from '@/components/admin/KpiStrip'
import { SkeletonCard } from '@/components/admin/SkeletonCard'
```

- [ ] **Remplacer la `<nav>` existante** par `<AdminNav>`

```tsx
<AdminNav
  newCount={candidatures.filter(c => {
    const days = (Date.now() - new Date(c.date_inscription).getTime()) / 86400000
    return days < 7
  }).length}
  onRefresh={() => fetchCandidatures(showArchived)}
  onExportCSV={handleExportCSV}
  onLogout={logout}
  onNewSession={() => setComposerOpen(true)}
  loading={loading}
/>
```

- [ ] **Ajouter `<KpiStrip>` sous la nav**

```tsx
<div style={{ padding: '.65rem .8rem 0' }}>
  <KpiStrip items={[
    { label: 'Nouvelles',      value: candidatures.filter(c => (Date.now() - new Date(c.date_inscription).getTime()) / 86400000 < 7).length, accent: true, trend: undefined },
    { label: 'Modèles actifs', value: candidatures.length },
    { label: 'Sessions',       value: 0 }, // ponytail: 0 car le count sessions vient d'un hook séparé — brancher sur useSessions quand dispo
    { label: 'Sélectionnés',   value: candidatures.filter(c => c.selectionne).length },
  ]} />
</div>
```

- [ ] **Remplacer le spinner `loading` par les SkeletonCards**

```tsx
{loading ? (
  <div style={{ padding: '.65rem .8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
    {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
) : /* … reste inchangé */}
```

- [ ] **Remplacer l'état vide générique** par l'empty state contextuel (Option A)

```tsx
filtered.length === 0 ? (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
    {/* Illustration fantôme */}
    <div style={{ width: 64, height: 64, borderRadius: '1rem', background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 8 }}>
      {[1,.7,.45,.25].map((op,i) => <div key={i} style={{ background: 'rgba(26,20,16,.12)', borderRadius: 3, opacity: op }} />)}
    </div>
    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.2rem', color: 'var(--ink)' }}>
      Aucun modèle trouvé
    </div>
    {/* Filtres actifs avec croix */}
    {hasActiveFilters && (
      <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {filterGenre && <button type="button" onClick={() => setFilterGenre(null)} style={filterChipStyle}>{filterGenre} ✕</button>}
        {filterSelectionne && <button type="button" onClick={() => setFilterSelectionne(false)} style={filterChipStyle}>Sélectionnés ✕</button>}
        {filterTier && <button type="button" onClick={() => setFilterTier(null)} style={filterChipStyle}>{filterTier} ✕</button>}
        {filterVille && <button type="button" onClick={() => setFilterVille('')} style={filterChipStyle}>{filterVille} ✕</button>}
        {filterDisponibilite && <button type="button" onClick={() => setFilterDisponibilite(null)} style={filterChipStyle}>{filterDisponibilite} ✕</button>}
        {filterExperience && <button type="button" onClick={() => setFilterExperience(null)} style={filterChipStyle}>{filterExperience} ✕</button>}
        {(tailleMin || tailleMax) && <button type="button" onClick={() => { setTailleMin(''); setTailleMax('') }} style={filterChipStyle}>{tailleMin||'?'}–{tailleMax||'?'} cm ✕</button>}
      </div>
    )}
    <div style={{ fontSize: '.52rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
      {search ? `Aucun modèle ne correspond à "${search}"` : 'Essaie d\'élargir les critères ou réinitialise les filtres'}
    </div>
    <button
      type="button"
      onClick={() => { setSearch(''); setFilterGenre(null); setFilterSelectionne(false); setTailleMin(''); setTailleMax(''); setFilterInstagram(false); setFilterVille(''); setFilterDisponibilite(null); setFilterExperience(null); setFilterTier(null); setFilterTag(null) }}
      style={{ height: 32, borderRadius: '100px', padding: '0 1rem', background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.44rem', letterSpacing: '.14em', fontWeight: 500, textTransform: 'uppercase', boxShadow: '0 1px 5px rgba(139,0,32,.28)' }}
    >
      Réinitialiser les filtres
    </button>
  </div>
) : /* … grille */
```

Ajouter `const filterChipStyle: React.CSSProperties = { height: 22, borderRadius: '100px', padding: '0 .6rem', fontSize: '.44rem', fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase', background: 'rgba(139,0,32,.07)', color: 'var(--red)', border: '1px solid rgba(139,0,32,.16)', cursor: 'pointer' }` avant le `return`.

- [ ] **Remplacer la grille** pour passer à la logique panel ouvert = largeur fixe

```tsx
<div style={{
  display: 'flex',
  gap: '.6rem',
  padding: '.65rem .8rem 6rem',
}}>
  {/* Zone grille — rétrécit quand panel ouvert */}
  <div style={{
    flex: detail ? '0 0 auto' : 1,
    maxWidth: detail ? 'calc(2 * 200px + .5rem)' : undefined,
    transition: 'max-width .4s var(--spring), flex .4s var(--spring)',
    minWidth: 0,
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: detail
        ? 'repeat(2, minmax(0, 200px))'
        : 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '1rem',
    }}>
      {filtered.map((c, i) => (
        <CandidatureCard
          key={c.id}
          c={c}
          selected={selectedIds.has(c.id)}
          isDuplicate={duplicateEmails.has(c.email)}
          onToggle={toggleSelect}
          onViewDetail={setDetail}
          onTierChange={handleTierChange}
          style={!detail && c.tier === 'ambassadeur' ? { gridRow: 'span 2' } : undefined}
        />
      ))}
    </div>
    {/* Load more */}
    {hasMore && !detail && (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button onClick={loadMore} disabled={loadingMore} style={{ fontSize: '.5rem', letterSpacing: '.3em', fontWeight: 500, textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', padding: '.7rem 2rem', cursor: loadingMore ? 'not-allowed' : 'pointer', color: 'var(--muted)', opacity: loadingMore ? .5 : 1 }}>
          {loadingMore ? 'Chargement…' : 'Charger plus'}
        </button>
      </div>
    )}
  </div>

  {/* Panel détail */}
  <AnimatePresence>
    {detail && (
      <DetailPanel
        key={detail.id}
        detail={detail}
        onClose={() => setDetail(null)}
        candidatures={candidatures}
        setCandidatures={setCandidatures}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onTierChange={handleTierChange}
        onToggleSelectionne={handleToggleSelectionne}
        onLightbox={setLightbox}
        onSessionStatus={setSessionStatusId}
        showToast={showToast}
        sending={sending}
        setSending={setSending}
        onSendSession={handleSendSession}
      />
    )}
  </AnimatePresence>
</div>
```

Note : ajouter `style?: React.CSSProperties` aux Props de `CandidatureCard` et l'appliquer sur la div racine pour le `grid-row: span 2`.

- [ ] **Mettre à jour l'appel FloatingBar** pour passer `selectedItems`

```tsx
<FloatingBar
  selectedCount={selectedCount}
  selectedBreakdown={selectedBreakdown}
  selectedItems={filtered.filter(c => selectedIds.has(c.id))}
  notifying={notifying}
  confirmNotify={confirmNotify}
  onClearSelection={clearSelection}
  onRequestNotify={/* … */}
  onConfirmNotify={/* … */}
  onCancelNotify={/* … */}
  onComposeSession={() => setComposerOpen(true)}
  onCopyList={handleCopyList}
/>
```

- [ ] **Supprimer le hint clavier dans `useEffect`** — il existe déjà, vérifier qu'il couvre bien `ArrowLeft` et `ArrowRight` (déjà présent dans le code existant ligne 146-147, rien à modifier).

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/admin/dashboard/page.tsx
git commit -m "refactor: dashboard — AdminNav, KpiStrip, grille fixe panel, SkeletonCard, empty state"
```

---

## Task 11 — Validation visuelle

- [ ] **Démarrer le dev server**

```bash
npm run dev
```

- [ ] **Ouvrir http://localhost:3000/admin/dashboard et vérifier :**

  - [ ] Pill nav flottante visible, liens fonctionnels, badge cloche, bouton Session
  - [ ] KPI bande unifiée sous la nav
  - [ ] Chips filtres scrollables, chip Tri cycle en cliquant, drawer avancés s'ouvre
  - [ ] Cards double-bezel, info B (dispo dot + tags), tier badges corrects
  - [ ] Card Ambassadeur fond sombre + accents or si un modèle a tier=ambassadeur
  - [ ] Sélection card : outline rouge + fond teinté
  - [ ] Clic `→` ouvre le DetailPanel, grille passe en 2 colonnes fixe sans étirement
  - [ ] FloatingBar apparaît avec thumbnails quand ≥ 2 sélectionnés, spring animation
  - [ ] Empty state : filtrer avec Femmes + taille 200 → voir illustration + filtres actifs + CTA
  - [ ] Skeleton cards pendant le chargement initial (tester en throttling réseau DevTools)
  - [ ] Mobile : ouvrir à 375px, bottom nav non implémenté (hors scope phase 12)

- [ ] **Vérifier TypeScript final**

```bash
npx tsc --noEmit
```

- [ ] **Commit final**

```bash
git add -A
git commit -m "chore: validation visuelle dashboard phase 12"
```
