# Dashboard · Modèles — Plan d'implémentation

> **For agentic workers:** Use `superpowers:executing-plans` to run this plan task-by-task (`- [ ]` syntax).

**Goal:** 6 fonctionnalités groupées → test à la fin → compaction CLAUDE.md.

**Algorithme de filtrage :** Scan linéaire `O(n)` via `Array.filter()` dans `useMemo` — correct pour < 2 000 enregistrements. `useDeferredValue` sur la recherche texte évite de bloquer l'UI à chaque frappe. Pas de Fuse.js — YAGNI.

**Stack :** Next.js 15 App Router · TypeScript strict · Tailwind v4 · Supabase REST raw fetch · `verifyToken` depuis `@/lib/auth`

---

## Task A1 — Recherche étendue + filtres dispo/expérience + tri âge + CSV filtré + bouton Instagram

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/components/admin/DashboardFilters.tsx`
- Modify: `src/types/candidature.ts`

### Contexte
La recherche actuelle couvre `prenom + nom + email`. Le `useMemo filtered` n'a pas de filtre `disponibilite` ni `experience`. Le CSV exporte `candidatures` (tout) au lieu de `filtered` (résultats visibles). `SortKey` n'a pas `'age'`.

---

- [ ] **Step 1 — Étendre `SortKey` dans `src/types/candidature.ts`**

```ts
export type SortKey = 'date' | 'nom' | 'taille' | 'age'
```

- [ ] **Step 2 — Ajouter les états manquants dans `dashboard/page.tsx`**

Après `const [tailleMax, setTailleMax] = useState('')` (ligne ~35) :

```tsx
const [filterInstagram,     setFilterInstagram]     = useState(false)
const [filterVille,         setFilterVille]         = useState('')
const [filterDisponibilite, setFilterDisponibilite] = useState<string | null>(null)
const [filterExperience,    setFilterExperience]    = useState<string | null>(null)
```

- [ ] **Step 3 — Remplacer le bloc `.filter` + `.sort` du `useMemo` dans `dashboard/page.tsx`**

Remplacer entièrement `const filtered = useMemo(() => candidatures` jusqu'à la fermeture du useMemo (lignes 50-66) :

```tsx
const filtered = useMemo(() => candidatures
  .filter(c => {
    const q = deferredSearch.toLowerCase()
    if (q && ![c.prenom, c.nom, c.email, c.ville ?? '', c.telephone, c.instagram ?? '']
      .some(v => v.toLowerCase().includes(q))) return false
    if (filterGenre        && c.genre          !== filterGenre)        return false
    if (filterSelectionne  && !c.selectionne)                          return false
    if (tailleMin          && (c.taille ?? 0) < Number(tailleMin))     return false
    if (tailleMax          && (c.taille ?? 999) > Number(tailleMax))   return false
    if (filterInstagram    && !c.instagram)                            return false
    if (filterVille        && !c.ville?.toLowerCase().includes(filterVille.toLowerCase())) return false
    if (filterDisponibilite && c.disponibilite !== filterDisponibilite) return false
    if (filterExperience   && c.experience    !== filterExperience)    return false
    return true
  })
  .sort((a, b) => {
    let cmp = 0
    if (sortBy === 'nom')    cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
    if (sortBy === 'taille') cmp = (a.taille ?? 0) - (b.taille ?? 0)
    if (sortBy === 'date')   cmp = new Date(a.date_inscription).getTime() - new Date(b.date_inscription).getTime()
    if (sortBy === 'age') {
      const ageA = a.date_naissance ? new Date().getFullYear() - new Date(a.date_naissance).getFullYear() : 0
      const ageB = b.date_naissance ? new Date().getFullYear() - new Date(b.date_naissance).getFullYear() : 0
      cmp = ageA - ageB
    }
    return sortAsc ? cmp : -cmp
  }),
  [candidatures, deferredSearch, filterGenre, filterSelectionne, tailleMin, tailleMax,
   filterInstagram, filterVille, filterDisponibilite, filterExperience, sortBy, sortAsc])
```

- [ ] **Step 4 — Corriger `handleExportCSV` pour exporter `filtered` dans `dashboard/page.tsx`**

Remplacer la fonction entière `handleExportCSV` (lignes ~78-93) :

```tsx
function handleExportCSV() {
  if (filtered.length > 500 && !window.confirm(`Exporter ${filtered.length} candidatures ?`)) return
  const headers = ['Prénom','Nom','Email','Téléphone','Genre','Taille','Ville','Pays',
    'Expérience','Disponibilité','Langues','Instagram','Date inscription','Notifié']
  const rows = filtered.map(c => [
    c.prenom, c.nom, c.email, c.telephone, c.genre ?? '',
    c.taille ?? '', c.ville ?? '', c.pays ?? '',
    c.experience ?? '', c.disponibilite ?? '', c.langues ?? '',
    c.instagram ?? '',
    new Date(c.date_inscription).toLocaleDateString('fr-CA'),
    c.selectionne ? 'Oui' : 'Non',
  ])
  const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `lumina-${new Date().toISOString().slice(0,10)}.csv` })
  a.click(); URL.revokeObjectURL(url)
}
```

- [ ] **Step 5 — Mettre à jour `hasActiveFilters` et `onResetFilters` dans `dashboard/page.tsx`**

```tsx
hasActiveFilters={!!(filterGenre || filterSelectionne || tailleMin || tailleMax
  || filterInstagram || filterVille || filterDisponibilite || filterExperience)}
onResetFilters={() => {
  setFilterGenre(null); setFilterSelectionne(false); setTailleMin(''); setTailleMax('')
  setFilterInstagram(false); setFilterVille(''); setFilterDisponibilite(null); setFilterExperience(null)
}}
```

- [ ] **Step 6 — Passer les nouvelles props à `<DashboardFilters>` dans `dashboard/page.tsx`**

Ajouter dans le bloc `<DashboardFilters .../>` :

```tsx
filterInstagram={filterInstagram}           onFilterInstagram={setFilterInstagram}
filterVille={filterVille}                   onFilterVille={setFilterVille}
filterDisponibilite={filterDisponibilite}   onFilterDisponibilite={setFilterDisponibilite}
filterExperience={filterExperience}         onFilterExperience={setFilterExperience}
```

- [ ] **Step 7 — Étendre l'interface `Props` de `DashboardFilters.tsx`**

Ajouter dans l'interface `Props` :

```tsx
filterInstagram:        boolean
onFilterInstagram:      (v: boolean) => void
filterVille:            string
onFilterVille:          (v: string) => void
filterDisponibilite:    string | null
onFilterDisponibilite:  (v: string | null) => void
filterExperience:       string | null
onFilterExperience:     (v: string | null) => void
```

Ajouter dans le destructuring de la fonction `DashboardFilters` :

```tsx
filterInstagram, onFilterInstagram,
filterVille, onFilterVille,
filterDisponibilite, onFilterDisponibilite,
filterExperience, onFilterExperience,
```

- [ ] **Step 8 — Ajouter le bouton Instagram dans la ligne 1 des filtres de `DashboardFilters.tsx`**

Après le bouton "Archivées" (ligne ~103) :

```tsx
<button
  type="button"
  onClick={() => onFilterInstagram(!filterInstagram)}
  className="font-medium uppercase transition-colors duration-200"
  style={{ fontSize: '.44rem', letterSpacing: '.22em', cursor: 'pointer',
    border: `1px solid ${filterInstagram ? 'var(--red)' : 'var(--border)'}`,
    color: filterInstagram ? 'var(--red)' : 'var(--muted)',
    background: filterInstagram ? 'rgba(139,0,32,.04)' : 'transparent',
    padding: '.35rem .8rem' }}
>
  Instagram ✦
</button>
```

- [ ] **Step 9 — Ajouter les filtres ville, dispo et expérience dans la ligne 2 de `DashboardFilters.tsx`**

Après le filtre taille (avant le bloc "Tri") :

```tsx
{/* Ville */}
<input
  type="text"
  value={filterVille}
  onChange={e => onFilterVille(e.target.value)}
  placeholder="Ville…"
  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.62rem',
    color: 'var(--ink)', background: 'transparent', border: '1px solid var(--border)',
    outline: 'none', padding: '.25rem .6rem', width: '6rem' }}
  onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
/>

{/* Disponibilité */}
{(['Flexible','Jours de semaine','Weekends','Voyages OK'] as const).map(d => (
  <button key={d} type="button"
    onClick={() => onFilterDisponibilite(filterDisponibilite === d ? null : d)}
    className="font-medium uppercase transition-colors duration-200"
    style={{ fontSize: '.4rem', letterSpacing: '.18em', cursor: 'pointer', whiteSpace: 'nowrap',
      border: `1px solid ${filterDisponibilite === d ? 'var(--red)' : 'var(--border)'}`,
      color: filterDisponibilite === d ? 'var(--red)' : 'var(--muted)',
      background: filterDisponibilite === d ? 'rgba(139,0,32,.04)' : 'transparent',
      padding: '.25rem .6rem' }}
  >{d}</button>
))}

{/* Expérience */}
{(['Débutant(e)','Quelques shootings','Expérimenté(e)'] as const).map(exp => (
  <button key={exp} type="button"
    onClick={() => onFilterExperience(filterExperience === exp ? null : exp)}
    className="font-medium uppercase transition-colors duration-200"
    style={{ fontSize: '.4rem', letterSpacing: '.18em', cursor: 'pointer', whiteSpace: 'nowrap',
      border: `1px solid ${filterExperience === exp ? 'var(--red)' : 'var(--border)'}`,
      color: filterExperience === exp ? 'var(--red)' : 'var(--muted)',
      background: filterExperience === exp ? 'rgba(139,0,32,.04)' : 'transparent',
      padding: '.25rem .6rem' }}
  >{exp}</button>
))}
```

- [ ] **Step 10 — Ajouter le tri Âge dans la ligne tri de `DashboardFilters.tsx`**

Le tableau `[['date','Date'],['nom','Nom'],['taille','Taille']]` (ligne ~152) devient :

```tsx
{([['date','Date'],['nom','Nom'],['taille','Taille'],['age','Âge']] as [SortKey, string][]).map(...)}
```

- [ ] **Step 11 — Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 12 — Commit**

```bash
git add src/app/admin/dashboard/page.tsx src/components/admin/DashboardFilters.tsx src/types/candidature.ts
git commit -m "feat: recherche étendue (ville/tel/ig), filtres dispo/expérience/instagram, tri âge, CSV filtré"
```

---

## Task A2 — Bouton "Copier liste" dans la FloatingBar

**Files:**
- Modify: `src/components/admin/FloatingBar.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`

### Contexte
Cas d'usage quotidien : l'agent copie la liste `Prénom Nom — Xcm — Ville` pour l'envoyer au photographe ou au client par email/WhatsApp. La FloatingBar est déjà visible quand une sélection est active.

---

- [ ] **Step 1 — Ajouter `onCopyList` dans `FloatingBar.tsx`**

Dans l'interface `Props`, ajouter :

```tsx
onCopyList: () => void
```

Dans le destructuring de la fonction :

```tsx
onCopyList,
```

Dans le bloc `{/* Droite — actions */}`, avant le bouton "Notifier la sélection" :

```tsx
<button
  onClick={onCopyList}
  className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
  style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em',
    color: 'rgba(247,243,238,.7)', background: 'none', border: 'none', padding: '.65rem .8rem', cursor: 'pointer' }}
>
  ⎘ Copier liste
</button>
```

- [ ] **Step 2 — Implémenter `handleCopyList` dans `dashboard/page.tsx`**

Ajouter la fonction (après `copyToClipboard`) :

```tsx
function handleCopyList() {
  const lines = filtered
    .filter(c => selectedIds.has(c.id))
    .map(c => [
      `${c.prenom} ${c.nom}`,
      c.taille ? `${c.taille} cm` : null,
      c.ville ?? null,
    ].filter(Boolean).join(' — '))
  copyToClipboard(lines.join('\n'))
}
```

- [ ] **Step 3 — Passer `onCopyList` à `<FloatingBar>` dans `dashboard/page.tsx`**

```tsx
onCopyList={handleCopyList}
```

- [ ] **Step 4 — Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 — Commit**

```bash
git add src/components/admin/FloatingBar.tsx src/app/admin/dashboard/page.tsx
git commit -m "feat: bouton ⎘ Copier liste dans la FloatingBar (Prénom Nom — taille — ville)"
```

---

## Task A3 — Vue liste dense (toggle grille ↔ liste)

**Files:**
- Create: `src/components/admin/CandidatureList.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/components/admin/DashboardFilters.tsx`

### Contexte
La grille photo est adaptée à la sélection visuelle. Pour scanner rapidement 50+ candidats (vérifier disponibilités, villes, mesures), une liste 1-ligne-par-candidat est plus efficace.

---

- [ ] **Step 1 — Créer `CandidatureList.tsx`**

```tsx
// CandidatureList — vue dense alternative à la grille CandidatureCard.
// 1 ligne par candidat : checkbox | nom | genre | taille | ville | dispo | date | instagram | →
'use client'

import type { Candidature } from '@/types/candidature'
import { calcAge } from '@/types/candidature'

interface Props {
  candidatures: Candidature[]
  selectedIds:  Set<string>
  onToggle:     (id: string) => void
  onViewDetail: (c: Candidature) => void
}

export function CandidatureList({ candidatures, selectedIds, onToggle, onViewDetail }: Props) {
  return (
    <div style={{ border: '1px solid var(--border)' }}>
      {/* En-tête */}
      <div
        className="hidden md:grid font-medium uppercase text-muted"
        style={{ gridTemplateColumns: '2rem 1fr 5rem 4rem 6rem 7rem 5rem 2rem 2rem',
          gap: '0 1rem', padding: '.5rem 1rem', borderBottom: '1px solid var(--border)',
          fontSize: '.4rem', letterSpacing: '.2em' }}
      >
        <span/>
        <span>Nom</span>
        <span>Genre</span>
        <span>Taille</span>
        <span>Ville</span>
        <span>Disponibilité</span>
        <span>Date</span>
        <span>IG</span>
        <span/>
      </div>

      {candidatures.map((c, i) => {
        const selected = selectedIds.has(c.id)
        const date     = new Date(c.date_inscription).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
        return (
          <div
            key={c.id}
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onToggle(c.id)}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(c.id) } }}
            className="grid items-center cursor-pointer transition-colors duration-150"
            style={{
              gridTemplateColumns: '2rem 1fr 5rem 4rem 6rem 7rem 5rem 2rem 2rem',
              gap: '0 1rem', padding: '.65rem 1rem',
              borderBottom: i < candidatures.length - 1 ? '1px solid var(--border)' : 'none',
              background: selected ? 'rgba(139,0,32,.03)' : 'transparent',
              borderLeft: selected ? '2px solid var(--red)' : '2px solid transparent',
              userSelect: 'none',
            }}
          >
            {/* Checkbox */}
            <div style={{ width: '1rem', height: '1rem', border: `1px solid ${selected ? 'var(--red)' : 'var(--border)'}`,
              background: selected ? 'var(--red)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {selected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            </div>

            {/* Nom + badges */}
            <div className="min-w-0">
              <span className="font-medium text-ink truncate block" style={{ fontSize: '.78rem' }}>
                {c.prenom} {c.nom}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {c.selectionne && <span style={{ fontSize: '.34rem', letterSpacing: '.12em', fontWeight: 600, color: '#fff', background: 'rgba(20,120,60,.8)', padding: '.1rem .35rem' }}>NOTIFIÉ</span>}
                {c.date_naissance && <span className="text-muted" style={{ fontSize: '.52rem' }}>{calcAge(c.date_naissance)} ans</span>}
              </div>
            </div>

            <span className="font-medium uppercase text-muted truncate" style={{ fontSize: '.5rem', letterSpacing: '.15em' }}>{c.genre ?? '—'}</span>
            <span className="font-light text-ink tabular-nums" style={{ fontSize: '.72rem' }}>{c.taille ? `${c.taille} cm` : '—'}</span>
            <span className="font-light text-muted truncate" style={{ fontSize: '.65rem' }}>{c.ville ?? '—'}</span>
            <span className="font-light text-muted truncate" style={{ fontSize: '.6rem' }}>{c.disponibilite ?? '—'}</span>
            <span className="font-light text-muted" style={{ fontSize: '.58rem' }}>{date}</span>

            {/* Instagram */}
            <span style={{ fontSize: '.65rem', color: c.instagram ? 'var(--red)' : 'transparent' }}>✦</span>

            {/* Voir détail */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onViewDetail(c) }}
              className="text-muted transition-colors duration-200 hover:text-red"
              style={{ background: 'none', fontSize: '.8rem', lineHeight: 1 }}
              aria-label="Voir le profil"
            >→</button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2 — Ajouter l'état `viewMode` dans `dashboard/page.tsx`**

```tsx
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
```

- [ ] **Step 3 — Passer `viewMode` et `onSetViewMode` à `DashboardFilters` dans `dashboard/page.tsx`**

```tsx
viewMode={viewMode} onSetViewMode={setViewMode}
```

- [ ] **Step 4 — Ajouter les props `viewMode` dans l'interface et le JSX de `DashboardFilters.tsx`**

Dans `Props` :

```tsx
viewMode:      'grid' | 'list'
onSetViewMode: (m: 'grid' | 'list') => void
```

Dans le JSX, à droite du "Tout sélect." (même ligne) :

```tsx
<div style={{ display: 'flex', border: '1px solid var(--border)', marginLeft: '.5rem' }}>
  {(['grid','list'] as const).map(m => (
    <button key={m} type="button" onClick={() => onSetViewMode(m)}
      className="font-medium uppercase"
      style={{ fontSize: '.4rem', letterSpacing: '.18em', padding: '.3rem .65rem',
        background: viewMode === m ? 'var(--ink)' : 'transparent',
        color:      viewMode === m ? 'var(--paper)' : 'var(--muted)',
        border: 'none', cursor: 'pointer' }}>
      {m === 'grid' ? '⊞' : '≡'}
    </button>
  ))}
</div>
```

- [ ] **Step 5 — Conditionner l'affichage dans `dashboard/page.tsx`**

Dans le bloc de la grille (actuellement `<div className="grid" ...>`), remplacer par :

```tsx
import { CandidatureList } from '@/components/admin/CandidatureList'

{/* ... dans le return : */}
{viewMode === 'list' ? (
  <CandidatureList
    candidatures={filtered}
    selectedIds={selectedIds}
    onToggle={toggleSelect}
    onViewDetail={setDetail}
  />
) : (
  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
    {filtered.map(c => (
      <CandidatureCard key={c.id} c={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} onViewDetail={setDetail} />
    ))}
  </div>
)}
```

- [ ] **Step 6 — Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7 — Commit**

```bash
git add src/components/admin/CandidatureList.tsx src/app/admin/dashboard/page.tsx src/components/admin/DashboardFilters.tsx
git commit -m "feat: vue liste dense avec toggle ⊞/≡ dans le dashboard"
```

---

## Task A4 — Édition candidature dans le DetailPanel

**Files:**
- Modify: `src/app/api/candidatures/[id]/route.ts`
- Modify: `src/components/admin/DetailPanel.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/hooks/admin/useCandidatures.ts`

### Contexte
Un candidat rappelle pour corriger son email ou sa ville. Actuellement impossible côté admin. Le PATCH actuel n'autorise que `selectionne` et `archived` — il faut étendre l'allowlist. Le DetailPanel aura un mode `editing` qui remplace les sections info par un formulaire.

---

- [ ] **Step 1 — Étendre le PATCH API dans `candidatures/[id]/route.ts`**

Remplacer le bloc `/* Allowlist */` (lignes ~69-74) :

```ts
const ALLOWED_STRING = ['prenom','nom','email','telephone','ville','pays','instagram',
  'experience','disponibilite','langues'] as const
const ALLOWED_BOOL   = ['selectionne','archived'] as const

const patch: Record<string, string | number | boolean | null> = {}
for (const f of ALLOWED_STRING) {
  if (f in body) {
    const v = body[f]
    patch[f] = typeof v === 'string' ? v.trim() || null : null
  }
}
for (const f of ALLOWED_BOOL) {
  if (typeof body[f] === 'boolean') patch[f] = body[f]
}
if (typeof body.taille === 'number' && body.taille > 0 && body.taille < 300) {
  patch.taille = body.taille
}
if (Object.keys(patch).length === 0) {
  return NextResponse.json({ success: false, message: 'Champ invalide.' }, { status: 400 })
}
```

- [ ] **Step 2 — Ajouter `handleEdit` dans `useCandidatures.ts`**

Ajouter la fonction avant le `return` final :

```ts
async function handleEdit(
  id: string,
  patch: Partial<Candidature>,
  setDetail: (fn: (prev: Candidature | null) => Candidature | null) => void,
  showToast: (msg: string) => void,
) {
  const res = await fetch(`/api/candidatures/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) { showToast('Erreur lors de la sauvegarde.'); return false }
  setCandidatures(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  setDetail(prev => prev?.id === id ? { ...prev, ...patch } : prev)
  showToast('Profil mis à jour.')
  return true
}
```

Ajouter `handleEdit` dans le `return` du hook.

- [ ] **Step 3 — Ajouter les props edit dans `DetailPanel.tsx`**

Dans l'interface `Props`, ajouter :

```tsx
onEdit: (patch: Partial<Candidature>) => Promise<boolean>
```

Dans le destructuring de `DetailPanel` :

```tsx
onEdit,
```

- [ ] **Step 4 — Ajouter le mode édition dans `DetailPanel.tsx`**

Ajouter l'état et le formulaire d'édition. Juste après la déclaration de la fonction `DetailPanel`, ajouter :

```tsx
const [editing, setEditing] = useState(false)
const [editForm, setEditForm] = useState({
  prenom:       detail.prenom,
  nom:          detail.nom,
  email:        detail.email,
  telephone:    detail.telephone,
  ville:        detail.ville ?? '',
  pays:         detail.pays ?? '',
  instagram:    detail.instagram ?? '',
  taille:       detail.taille ?? '',
  experience:   detail.experience ?? '',
  disponibilite:detail.disponibilite ?? '',
  langues:      detail.langues ?? '',
})
const [saving, setSaving] = useState(false)
```

Ajouter la fonction de sauvegarde :

```tsx
async function saveEdit() {
  setSaving(true)
  const patch: Record<string, string | number | null> = {
    prenom:       editForm.prenom       || null,
    nom:          editForm.nom          || null,
    email:        editForm.email        || null,
    telephone:    editForm.telephone    || null,
    ville:        editForm.ville        || null,
    pays:         editForm.pays         || null,
    instagram:    editForm.instagram    || null,
    experience:   editForm.experience   || null,
    disponibilite:editForm.disponibilite|| null,
    langues:      editForm.langues      || null,
  }
  if (editForm.taille) patch.taille = Number(editForm.taille)
  const ok = await onEdit(patch as Partial<Candidature>)
  if (ok) setEditing(false)
  setSaving(false)
}
```

- [ ] **Step 5 — Remplacer les sections info par le formulaire quand `editing` dans `DetailPanel.tsx`**

Dans le bloc `{/* Infos */}` (ligne ~127), entourer les `<DetailSection>` par un conditionnel :

```tsx
{editing ? (
  <div style={{ padding: '0 1.8rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
    {[
      ['Prénom',        'prenom'],
      ['Nom',           'nom'],
      ['Email',         'email'],
      ['Téléphone',     'telephone'],
      ['Taille (cm)',   'taille'],
      ['Ville',         'ville'],
      ['Pays',          'pays'],
      ['Instagram',     'instagram'],
      ['Langues',       'langues'],
    ].map(([label, key]) => (
      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
        <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>{label}</span>
        <input
          value={(editForm as Record<string, string>)[key] ?? ''}
          onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.78rem', color: 'var(--ink)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', padding: '.3rem 0', width: '100%' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>
    ))}
    {/* Expérience chips */}
    <div>
      <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.18em', display: 'block', marginBottom: '.4rem' }}>Expérience</span>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        {['Débutant(e)','Quelques shootings','Expérimenté(e)'].map(exp => (
          <button key={exp} type="button" onClick={() => setEditForm(f => ({ ...f, experience: exp }))}
            style={{ fontSize: '.44rem', letterSpacing: '.18em', padding: '.3rem .6rem', cursor: 'pointer',
              border: `1px solid ${editForm.experience === exp ? 'var(--red)' : 'var(--border)'}`,
              color: editForm.experience === exp ? 'var(--red)' : 'var(--muted)',
              background: editForm.experience === exp ? 'rgba(139,0,32,.04)' : 'transparent' }}>{exp}
          </button>
        ))}
      </div>
    </div>
    {/* Disponibilité chips */}
    <div>
      <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.18em', display: 'block', marginBottom: '.4rem' }}>Disponibilité</span>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        {['Flexible','Jours de semaine','Weekends','Voyages OK'].map(d => (
          <button key={d} type="button" onClick={() => setEditForm(f => ({ ...f, disponibilite: d }))}
            style={{ fontSize: '.44rem', letterSpacing: '.18em', padding: '.3rem .6rem', cursor: 'pointer',
              border: `1px solid ${editForm.disponibilite === d ? 'var(--red)' : 'var(--border)'}`,
              color: editForm.disponibilite === d ? 'var(--red)' : 'var(--muted)',
              background: editForm.disponibilite === d ? 'rgba(139,0,32,.04)' : 'transparent' }}>{d}
          </button>
        ))}
      </div>
    </div>
  </div>
) : (
  <div style={{ padding: '0 1.8rem 6rem' }}>
    {/* ... toutes les <DetailSection> existantes, inchangées ... */}
  </div>
)}
```

**Note :** Les sections info existantes (`<DetailSection label="Corps">` etc.) restent inchangées dans le bloc `else`. Couper/coller le bloc `<div style={{ padding: '0 1.8rem 6rem' }}>` existant.

- [ ] **Step 6 — Ajouter le bouton "Modifier / Enregistrer / Annuler" dans le footer de `DetailPanel.tsx`**

Dans le footer sticky (avant les boutons existants) :

```tsx
{editing ? (
  <div className="flex gap-2" style={{ marginBottom: '.6rem' }}>
    <button
      onClick={saveEdit}
      disabled={saving}
      className="flex-1 font-medium uppercase transition-opacity duration-200"
      style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em',
        background: 'var(--ink)', color: 'var(--paper)', border: 'none',
        padding: '.7rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .5 : 1 }}
    >
      {saving ? 'Sauvegarde…' : 'Enregistrer'}
    </button>
    <button
      onClick={() => setEditing(false)}
      className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
      style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.2em',
        background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
        padding: '.7rem 1rem', cursor: 'pointer' }}
    >
      Annuler
    </button>
  </div>
) : (
  <button
    onClick={() => setEditing(true)}
    className="w-full font-medium uppercase transition-opacity duration-200 hover:opacity-70"
    style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em',
      background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
      padding: '.7rem', cursor: 'pointer', marginBottom: '.6rem' }}
  >
    Modifier le profil
  </button>
)}
```

- [ ] **Step 7 — Passer `onEdit` dans `dashboard/page.tsx`**

Dans le bloc `<DetailPanel .../>` :

```tsx
onEdit={async patch => handleEdit(detail.id, patch, setDetail, showToast)}
```

- [ ] **Step 8 — Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9 — Commit**

```bash
git add src/app/api/candidatures/[id]/route.ts src/components/admin/DetailPanel.tsx src/hooks/admin/useCandidatures.ts src/app/admin/dashboard/page.tsx
git commit -m "feat: édition candidature depuis le DetailPanel (PATCH API étendu)"
```

---

## Task A5 — Détection de doublons

**Files:**
- Modify: `src/app/api/submit/route.ts`
- Modify: `src/components/admin/CandidatureCard.tsx`
- Modify: `src/hooks/admin/useCandidatures.ts`
- Modify: `src/app/admin/dashboard/page.tsx`

### Contexte
Deux axes :
1. **Prévention** : à la soumission, si l'email existe déjà → rejeter avec message clair (HTTP 409).
2. **Détection sur existants** : au chargement du dashboard, calculer les emails présents 2+ fois → badge "Doublon" sur les cartes concernées.

---

- [ ] **Step 1 — Ajouter la vérification doublon dans `submit/route.ts`**

Lire `src/app/api/submit/route.ts` pour trouver le point d'insertion (avant l'INSERT Supabase). Ajouter après la validation reCAPTCHA et avant l'upload photos :

```ts
/* Vérifier doublon email */
const dupCheck = await fetch(
  `${supabaseUrl}/rest/v1/candidatures?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
  { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' }
)
if (dupCheck.ok) {
  const existing = await dupCheck.json() as { id: string }[]
  if (existing.length > 0) {
    return NextResponse.json({
      success: false,
      message: 'Une candidature avec cet email existe déjà. Contactez-nous à casting@luminamodels.ca pour toute correction.',
    }, { status: 409 })
  }
}
```

**Note :** Vérifier les noms de variables `supabaseUrl` et `serviceKey` dans `submit/route.ts` avant d'écrire — ils peuvent être `url`/`key` ou autre.

- [ ] **Step 2 — Calculer `duplicateEmails` dans `useCandidatures.ts`**

Dans la fonction `useCandidatures`, ajouter après `const [archivedCount...]` :

```ts
const [duplicateEmails, setDuplicateEmails] = useState<Set<string>>(new Set())
```

Dans `fetchCandidatures`, après `setCandidatures(data.data)`, ajouter :

```ts
// Détecter les emails en double — visible dans la grille avec un badge
const emailCount = new Map<string, number>()
for (const c of data.data as Candidature[]) {
  emailCount.set(c.email, (emailCount.get(c.email) ?? 0) + 1)
}
setDuplicateEmails(new Set([...emailCount].filter(([,n]) => n > 1).map(([e]) => e)))
```

Ajouter `duplicateEmails` dans le `return` du hook.

- [ ] **Step 3 — Passer `duplicateEmails` jusqu'à `CandidatureCard` dans `dashboard/page.tsx`**

Récupérer `duplicateEmails` depuis `useCandidatures` :

```tsx
const { ..., duplicateEmails } = useCandidatures()
```

Dans le rendu de la grille et de la liste, passer `isDuplicate` :

```tsx
<CandidatureCard ... isDuplicate={duplicateEmails.has(c.email)} />
// et dans CandidatureList : même prop
```

- [ ] **Step 4 — Afficher le badge "Doublon" dans `CandidatureCard.tsx`**

Ajouter `isDuplicate: boolean` dans `Props`.

Dans la section badges (après le badge "Notifié") :

```tsx
{isDuplicate && (
  <div
    className="absolute bottom-2 left-2 font-medium uppercase"
    style={{ fontSize: '.36rem', letterSpacing: '.15em', background: 'rgba(200,100,0,.85)', color: '#fff', padding: '.2rem .45rem' }}
  >
    Doublon
  </div>
)}
```

- [ ] **Step 5 — Ajouter `isDuplicate` dans `CandidatureList.tsx`** (Task A3)

Dans `Props` de `CandidatureList`, ajouter `duplicateEmails: Set<string>`.

Dans chaque ligne, après le badge "NOTIFIÉ" :

```tsx
{duplicateEmails.has(c.email) && (
  <span style={{ fontSize: '.34rem', letterSpacing: '.12em', fontWeight: 600,
    color: '#fff', background: 'rgba(200,100,0,.85)', padding: '.1rem .35rem' }}>
    DOUBLON
  </span>
)}
```

- [ ] **Step 6 — Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7 — Commit**

```bash
git add src/app/api/submit/route.ts src/components/admin/CandidatureCard.tsx src/components/admin/CandidatureList.tsx src/hooks/admin/useCandidatures.ts src/app/admin/dashboard/page.tsx
git commit -m "feat: détection doublons (badge dashboard) + rejet à la soumission si email existant"
```

---

## Task B1 — Page publique /statut (statut de candidature)

**Files:**
- Create: `src/app/api/statut/route.ts`
- Create: `src/app/statut/page.tsx`

### Contexte
Un modèle peut vérifier le statut de sa candidature en entrant son email. Page publique, sans auth. Aucune donnée sensible exposée — uniquement le statut agrégé.

---

- [ ] **Step 1 — Créer `src/app/api/statut/route.ts`**

```ts
// GET /api/statut?email=... — lecture publique, rate-limit 30s/IP.
// Retourne uniquement un statut agrégé — pas de données personnelles.
import { NextRequest, NextResponse } from 'next/server'

const rl = new Map<string, number>()

export async function GET(req: NextRequest) {
  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  if ((rl.get(ip) ?? 0) > now - 30_000) {
    return NextResponse.json({ success: false, message: 'Trop de requêtes.' }, { status: 429 })
  }
  rl.set(ip, now)

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ success: false, message: 'Email invalide.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(
    `${url}/rest/v1/candidatures?email=eq.${encodeURIComponent(email)}&select=selectionne,archived&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 })

  const rows = await res.json() as { selectionne: boolean; archived: boolean }[]
  if (!rows.length) return NextResponse.json({ success: true, statut: 'non_trouve' })

  const { selectionne, archived } = rows[0]
  const statut = archived ? 'archive' : selectionne ? 'retenu' : 'en_attente'
  return NextResponse.json({ success: true, statut })
}
```

- [ ] **Step 2 — Créer `src/app/statut/page.tsx`**

```tsx
// Page publique — modèle vérifie son statut par email. Client Component, aucune auth.
'use client'

import { useState, type FormEvent } from 'react'

type Statut = 'en_attente' | 'retenu' | 'archive' | 'non_trouve' | null

const MESSAGES: Record<Exclude<Statut, null>, { titre: string; corps: string; couleur: string }> = {
  en_attente: {
    titre: 'Dossier en cours d\'évaluation',
    corps: 'Votre candidature a bien été reçue. Nous vous contacterons si votre profil correspond à nos besoins.',
    couleur: '#6b6b6b',
  },
  retenu: {
    titre: 'Profil retenu ✓',
    corps: 'Vous avez été sélectionné(e) pour une prochaine session. Vérifiez votre boîte email pour les détails de convocation.',
    couleur: 'rgba(20,120,60,.9)',
  },
  archive: {
    titre: 'Dossier archivé',
    corps: 'Votre dossier est actuellement archivé. Vous pouvez soumettre une nouvelle candidature si votre profil a évolué.',
    couleur: '#8B0020',
  },
  non_trouve: {
    titre: 'Aucun dossier trouvé',
    corps: 'Aucune candidature n\'est associée à cet email. Vérifiez l\'adresse ou soumettez une nouvelle candidature.',
    couleur: '#6b6b6b',
  },
}

export default function StatutPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [statut,  setStatut]  = useState<Statut>(null)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setStatut(null)
    try {
      const res  = await fetch(`/api/statut?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json() as { success: boolean; statut?: Statut; message?: string }
      if (!data.success) { setError(data.message ?? 'Erreur.'); return }
      setStatut(data.statut ?? null)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  const info = statut ? MESSAGES[statut] : null

  return (
    <div style={{ minHeight: '100dvh', background: '#f7f3ee', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '3rem 1rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#fff', padding: '2.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>

        <p style={{ fontSize: '.78rem', color: '#6b6b6b', letterSpacing: '.15em', textTransform: 'uppercase',
          fontWeight: 600, margin: '0 0 .5rem' }}>Lumina Photography</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#0c0b09', margin: '0 0 2rem' }}>
          Statut de candidature
        </h1>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 600, color: '#6b6b6b',
            letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.5rem' }}>
            Votre adresse email
          </label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            style={{ width: '100%', padding: '.75rem', fontSize: '.9rem', border: '1px solid #e0e0e0',
              outline: 'none', fontFamily: 'Arial, sans-serif', color: '#0c0b09',
              background: '#fff', boxSizing: 'border-box', marginBottom: '1rem' }}
          />
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '1rem', background: '#8B0020', color: '#fff',
              border: 'none', fontSize: '.85rem', fontWeight: 700, letterSpacing: '.1em',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? 'Vérification…' : 'Vérifier mon statut'}
          </button>
        </form>

        {error && <p style={{ marginTop: '1.5rem', color: '#8B0020', fontSize: '.85rem' }}>{error}</p>}

        {info && (
          <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'rgba(0,0,0,.02)',
            borderLeft: `3px solid ${info.couleur}` }}>
            <div style={{ fontSize: '.88rem', fontWeight: 700, color: info.couleur, marginBottom: '.5rem' }}>
              {info.titre}
            </div>
            <p style={{ fontSize: '.85rem', color: '#0c0b09', lineHeight: 1.7, margin: 0 }}>{info.corps}</p>
          </div>
        )}

        <div style={{ marginTop: '3rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem',
          fontSize: '.75rem', color: '#9b9b9b' }}>
          <span style={{ fontFamily: 'Georgia, serif', color: '#8B0020', fontWeight: 700 }}>Lumina</span>
          {' '}Photography ·{' '}
          <a href="mailto:casting@luminamodels.ca" style={{ color: '#9b9b9b' }}>casting@luminamodels.ca</a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 — Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 — Commit**

```bash
git add src/app/api/statut/route.ts src/app/statut/page.tsx
git commit -m "feat: page publique /statut — modèle vérifie son statut de candidature par email"
```

---

## Task T1 — Test manuel (toutes fonctionnalités)

- [ ] **A1 — Filtres**
  - Rechercher "paris" → seules les candidatures avec "Paris" dans ville/prenom/nom s'affichent
  - Rechercher un numéro de téléphone partiel → résultat attendu
  - Rechercher "@handle" → modèle avec ce handle Instagram trouvé
  - Filtre "Instagram ✦" → seules les candidatures avec instagram s'affichent
  - Filtre "Weekends" → seules celles avec disponibilite "Weekends"
  - Filtre "Expérimenté(e)" → seules celles avec cette expérience
  - Filtre ville "Paris" → résultats filtrés
  - Tri "Âge" ↑ → les plus jeunes en premier ; ↓ → les plus âgés en premier
  - Réinitialiser → tous les filtres remis à zéro
  - Export CSV avec filtres actifs → le fichier ne contient que les résultats filtrés, colonne Instagram présente

- [ ] **A2 — Copier liste**
  - Sélectionner 3 candidatures → FloatingBar affiche "⎘ Copier liste"
  - Cliquer → toast "Copié" ; coller ailleurs → format `Prénom Nom — Xcm — Ville` sur chaque ligne

- [ ] **A3 — Vue liste**
  - Cliquer "≡" → la grille photo disparaît, liste dense affichée
  - Chaque ligne : nom, genre, taille, ville, dispo, date, ✦ si instagram
  - Cliquer une ligne → sélection toggle (même comportement que carte)
  - Cliquer "→" → DetailPanel s'ouvre
  - Cliquer "⊞" → retour à la grille

- [ ] **A4 — Édition**
  - Ouvrir DetailPanel → bouton "Modifier le profil" visible en footer
  - Cliquer → formulaire apparaît avec les valeurs pré-remplies
  - Modifier le téléphone → "Enregistrer" → panel revient en vue, valeur mise à jour
  - Appuyer "Annuler" → retour sans modification
  - Vérifier en DB via Supabase que la valeur est bien changée

- [ ] **A5 — Doublons**
  - Soumettre une 2e candidature avec le même email → message d'erreur explicite (pas de 500)
  - Dans le dashboard : si 2 candidatures ont le même email → badge orange "Doublon" sur les 2 cartes
  - En vue liste → badge "DOUBLON" visible

- [ ] **B1 — Page statut**
  - Visiter `/statut` sans auth → page accessible
  - Saisir l'email d'une candidature `selectionne=false, archived=false` → "Dossier en cours d'évaluation"
  - Saisir l'email d'une candidature `selectionne=true` → "Profil retenu ✓"
  - Saisir l'email d'une candidature `archived=true` → "Dossier archivé"
  - Saisir un email inconnu → "Aucun dossier trouvé"
  - Soumettre 2× en < 30s → "Trop de requêtes"

---

## Task X1 — Compaction CLAUDE.md

- [ ] **Mettre à jour `CLAUDE.md`** — remplacer la ligne "Phases" par :

```
Phases 0–9 terminées. Phase 9 (2026-06-25) : filtres avancés dashboard (recherche étendue, dispo/expérience/instagram), CSV filtré, tri âge, vue liste dense, bouton copier liste, édition candidature, détection doublons, page publique /statut.
```

- [ ] **Ajouter sous "Nouvelles routes API"** :

```
- `api/statut/` — GET public, email → statut candidature (rate-limit 30s/IP)
```

- [ ] **Ajouter sous "Nouveaux composants"** :

```
- `CandidatureList.tsx` — vue liste dense (toggle ⊞/≡ dans dashboard)
```

- [ ] **Vérifier que CLAUDE.md < 150 lignes** — tailler si nécessaire.

- [ ] **Commit final**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md phase 9 — filtres, édition, doublons, /statut, vue liste"
```
