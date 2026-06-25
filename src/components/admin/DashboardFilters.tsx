// DashboardFilters — barre de recherche, filtres genre/notifiés/taille et tri.
// Purement présentationnel : reçoit l'état et expose des callbacks vers le parent.
'use client'

import type { ChangeEvent } from 'react'
import type { SortKey } from '@/types/candidature'

interface Props {
  search:              string
  onSearch:            (v: string) => void
  filterGenre:         string | null
  onFilterGenre:       (g: string | null) => void
  filterSelectionne:   boolean
  onFilterSelectionne: (v: boolean) => void
  tailleMin:           string
  tailleMax:           string
  onTailleMin:         (v: string) => void
  onTailleMax:         (v: string) => void
  sortBy:              SortKey
  sortAsc:             boolean
  onSort:              (key: SortKey) => void
  allFilteredSelected: boolean
  onToggleSelectAll:   () => void
  filteredCount:       number
  totalCount:          number
  hasActiveFilters:    boolean
  onResetFilters:      () => void
  showArchived:        boolean
  onToggleArchived:    () => void
  archivedCount:       number
}

function sortBtnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily:   "'Montserrat', sans-serif",
    fontSize:     '.44rem',
    letterSpacing: '.22em',
    border:       `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
    color:        active ? 'var(--ink)' : 'var(--muted)',
    background:   'transparent',
    padding:      '.35rem .8rem',
    cursor:       'pointer',
    fontWeight:   active ? 500 : 400,
    transition:   'all .15s',
  }
}

export function DashboardFilters({
  search, onSearch,
  filterGenre, onFilterGenre,
  filterSelectionne, onFilterSelectionne,
  tailleMin, tailleMax, onTailleMin, onTailleMax,
  sortBy, sortAsc, onSort,
  allFilteredSelected, onToggleSelectAll,
  filteredCount, totalCount,
  hasActiveFilters, onResetFilters,
  showArchived, onToggleArchived, archivedCount,
}: Props) {
  return (
    <div style={{ padding: '2rem 2rem 0' }}>
      {/* Recherche */}
      <div style={{ maxWidth: '42rem', marginBottom: '1.2rem' }}>
        <input
          type="search"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
          className="w-full bg-transparent text-ink font-light outline-none"
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.9rem', borderBottom: '1px solid var(--border)', paddingBottom: '.75rem', transition: 'border-color .2s' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* Ligne 1 — genre + notifiés + tout sélect. */}
      <div className="flex items-center gap-[.5rem] flex-wrap mb-[.75rem]">
        {(['Femme', 'Homme', 'Non-binaire'] as const).map(g => (
          <button
            key={g}
            type="button"
            onClick={() => onFilterGenre(filterGenre === g ? null : g)}
            className="font-medium uppercase transition-colors duration-200"
            style={{ fontSize: '.44rem', letterSpacing: '.22em', cursor: 'pointer', border: `1px solid ${filterGenre === g ? 'var(--red)' : 'var(--border)'}`, color: filterGenre === g ? 'var(--red)' : 'var(--muted)', background: filterGenre === g ? 'rgba(139,0,32,.04)' : 'transparent', padding: '.35rem .8rem' }}
          >
            {g}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onFilterSelectionne(!filterSelectionne)}
          className="font-medium uppercase transition-colors duration-200"
          style={{ fontSize: '.44rem', letterSpacing: '.22em', cursor: 'pointer', border: `1px solid ${filterSelectionne ? 'var(--red)' : 'var(--border)'}`, color: filterSelectionne ? 'var(--red)' : 'var(--muted)', background: filterSelectionne ? 'rgba(139,0,32,.04)' : 'transparent', padding: '.35rem .8rem' }}
        >
          Notifiés
        </button>
        <button
          type="button"
          onClick={onToggleArchived}
          className="font-medium uppercase transition-colors duration-200"
          style={{ fontSize: '.44rem', letterSpacing: '.22em', cursor: 'pointer', border: `1px solid ${showArchived ? 'var(--ink)' : 'var(--border)'}`, color: showArchived ? 'var(--ink)' : 'var(--muted)', background: showArchived ? 'rgba(0,0,0,.06)' : 'transparent', padding: '.35rem .8rem' }}
        >
          Archivées{archivedCount > 0 && !showArchived ? ` (${archivedCount})` : ''}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="font-medium uppercase text-muted transition-colors duration-200 hover:text-red"
            style={{ fontSize: '.44rem', letterSpacing: '.22em', background: 'none', padding: '.35rem .5rem' }}
          >
            Réinitialiser ×
          </button>
        )}
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="font-medium uppercase transition-colors duration-200"
            style={{ fontSize: '.44rem', letterSpacing: '.22em', cursor: 'pointer', border: `1px solid ${allFilteredSelected ? 'var(--ink)' : 'var(--border)'}`, color: allFilteredSelected ? 'var(--ink)' : 'var(--muted)', background: 'transparent', padding: '.35rem .8rem' }}
          >
            {allFilteredSelected ? 'Tout désélect.' : 'Tout sélect.'}
          </button>
          <span className="text-muted font-light" style={{ fontSize: '.55rem' }}>
            {filteredCount} / {totalCount}
          </span>
        </div>
      </div>

      {/* Ligne 2 — taille + tri */}
      <div className="flex items-center gap-[.5rem] flex-wrap" style={{ marginBottom: '.5rem' }}>
        <div className="flex items-center gap-1" style={{ border: '1px solid var(--border)', padding: '.25rem .6rem' }}>
          <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.2em' }}>Taille</span>
          <input
            type="number"
            value={tailleMin}
            onChange={e => onTailleMin(e.target.value)}
            placeholder="min"
            style={{ width: '3rem', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.62rem', color: 'var(--ink)', textAlign: 'center' }}
          />
          <span className="text-muted" style={{ fontSize: '.55rem' }}>—</span>
          <input
            type="number"
            value={tailleMax}
            onChange={e => onTailleMax(e.target.value)}
            placeholder="max"
            style={{ width: '3rem', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.62rem', color: 'var(--ink)', textAlign: 'center' }}
          />
          <span className="text-muted" style={{ fontSize: '.4rem' }}>cm</span>
        </div>
        <div className="flex items-center gap-1" style={{ marginLeft: 'auto' }}>
          <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.2em', marginRight: '.3rem' }}>Tri</span>
          {([['date','Date'],['nom','Nom'],['taille','Taille']] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSort(key)}
              style={sortBtnStyle(sortBy === key)}
            >
              {label}{sortBy === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
