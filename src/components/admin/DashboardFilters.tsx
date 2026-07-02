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
  filterAvailDate:        string
  onFilterAvailDate:      (v: string) => void
  allTags:                string[]
  // Legacy props kept for backwards compatibility with existing callers
  allFilteredSelected?:   boolean
  onToggleSelectAll?:     () => void
  showArchived?:          boolean
  onToggleArchived?:      () => void
  archivedCount?:         number
  viewMode?:              'grid' | 'list'
  onSetViewMode?:         (m: 'grid' | 'list') => void
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
        transition: 'background .3s var(--spring), color .3s var(--spring), border-color .3s var(--spring)',
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
  filterAvailDate, onFilterAvailDate,
  allTags,
  showArchived, onToggleArchived, archivedCount,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  function cycleSortBy() {
    const idx  = SORT_CYCLE.indexOf(sortBy)
    const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]
    onSort(next)
  }

  const hasDrawerFilters = !!(tailleMin || tailleMax || filterDisponibilite || filterExperience || filterTier || filterTag || filterInstagram || filterVille || filterAvailDate)

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

          {/* Archivées toggle */}
          {onToggleArchived && (
            <Chip
              label={showArchived ? `Archivées (${archivedCount ?? 0})` : 'Archivées'}
              active={!!showArchived}
              onClick={onToggleArchived}
            />
          )}

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
