// FiltersDrawer — drawer filtres avancés, slide-up depuis le bas.
// Contient : taille, dispo, expérience, tier, tag, instagram, ville.
'use client'

import { useEffect } from 'react'
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

const DISPONIBILITES = ['Flexible', 'Jours de semaine', 'Weekends', 'Voyages OK']
const EXPERIENCES    = ['Débutant(e)', 'Quelques shootings', 'Expérimenté(e)']

function DrawerChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: '24px', borderRadius: '100px', padding: '0 .65rem',
        fontSize: '.46rem', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase',
        border: `1px solid ${active ? 'var(--color-ink)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-ink)' : '#fff',
        color: active ? 'var(--color-paper)' : 'var(--color-ink)',
        cursor: 'pointer',
        transition: 'background .25s var(--spring), color .25s var(--spring), border-color .25s var(--spring)',
      }}
    >
      {label}
    </button>
  )
}

function DrawerInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-muted)' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: '30px', borderRadius: '.55rem', border: '1px solid var(--color-border)',
          background: 'var(--color-paper)', padding: '0 .6rem',
          fontSize: '.52rem', color: 'var(--color-ink)', outline: 'none',
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
        background: 'var(--color-paper)',
        borderRadius: '1.25rem 1.25rem 0 0',
        padding: '1.5rem 1.5rem 2rem',
        boxShadow: '0 -8px 32px rgba(26,20,16,.12)',
        animation: 'drawerUp .35s var(--spring)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto .75rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 300 }}>Filtres avancés</span>
          {hasActiveFilters && (
            <button type="button" onClick={onResetAll} style={{ fontSize: '.46rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Tout réinitialiser
            </button>
          )}
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Taille */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '.5rem' }}>Taille (cm)</div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <DrawerInput label="Min" value={tailleMin} onChange={onTailleMin} placeholder="165" />
              <DrawerInput label="Max" value={tailleMax} onChange={onTailleMax} placeholder="185" />
            </div>
          </div>

          {/* Disponibilité */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '.5rem' }}>Disponibilité</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {DISPONIBILITES.map(d => (
                <DrawerChip key={d} label={d} active={filterDisponibilite === d} onClick={() => onFilterDisponibilite(filterDisponibilite === d ? null : d)} />
              ))}
            </div>
          </div>

          {/* Expérience */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '.5rem' }}>Expérience</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {EXPERIENCES.map(exp => (
                <DrawerChip key={exp} label={exp} active={filterExperience === exp} onClick={() => onFilterExperience(filterExperience === exp ? null : exp)} />
              ))}
            </div>
          </div>

          {/* Tier */}
          <div>
            <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '.5rem' }}>Tier</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {(Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG[Tier]][]).map(([key, cfg]) => (
                <DrawerChip key={key} label={cfg.label} active={filterTier === key} onClick={() => onFilterTier(filterTier === key ? null : key)} />
              ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <div style={{ fontSize: '.4rem', letterSpacing: '.16em', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '.5rem' }}>Tags</div>
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
              style={{ width: 16, height: 16, accentColor: 'var(--color-red)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '.5rem', letterSpacing: '.1em', fontWeight: 400, color: 'var(--color-ink)' }}>Instagram uniquement</span>
          </label>

        </div>

        {/* CTA Fermer */}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '1.5rem', width: '100%', height: '40px', borderRadius: '100px',
            background: 'var(--color-ink)', color: 'var(--color-paper)', border: 'none', cursor: 'pointer',
            fontSize: '.48rem', letterSpacing: '.18em', fontWeight: 500, textTransform: 'uppercase',
          }}
        >
          Appliquer
        </button>
      </div>
    </>
  )
}
