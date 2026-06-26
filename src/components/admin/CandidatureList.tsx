// CandidatureList — vue dense alternative à la grille CandidatureCard.
// 1 ligne par candidat : checkbox | nom | genre | taille | ville | dispo | date | instagram | →
'use client'

import type { Candidature } from '@/types/candidature'
import { calcAge } from '@/types/candidature'

interface Props {
  candidatures:    Candidature[]
  selectedIds:     Set<string>
  duplicateEmails?: Set<string>
  onToggle:        (id: string) => void
  onViewDetail:    (c: Candidature) => void
}

export function CandidatureList({ candidatures, selectedIds, duplicateEmails = new Set(), onToggle, onViewDetail }: Props) {
  return (
    <div style={{ border: '1px solid var(--border)' }}>
      {/* En-tête */}
      <div
        className="hidden md:grid font-medium uppercase text-muted"
        style={{ gridTemplateColumns: '2rem 1fr 5rem 4rem 6rem 8rem 5rem 1.5rem 2rem',
          gap: '0 1rem', padding: '.5rem 1rem', borderBottom: '1px solid var(--border)',
          fontSize: '.4rem', letterSpacing: '.2em' }}
      >
        <span />
        <span>Nom</span>
        <span>Genre</span>
        <span>Taille</span>
        <span>Ville</span>
        <span>Disponibilité</span>
        <span>Date</span>
        <span>IG</span>
        <span />
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
              gridTemplateColumns: '2rem 1fr 5rem 4rem 6rem 8rem 5rem 1.5rem 2rem',
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
                {c.selectionne && (
                  <span style={{ fontSize: '.34rem', letterSpacing: '.12em', fontWeight: 600, color: '#fff', background: 'rgba(20,120,60,.8)', padding: '.1rem .35rem' }}>NOTIFIÉ</span>
                )}
                {duplicateEmails.has(c.email) && (
                  <span style={{ fontSize: '.34rem', letterSpacing: '.12em', fontWeight: 600, color: '#fff', background: 'rgba(200,100,0,.85)', padding: '.1rem .35rem' }}>DOUBLON</span>
                )}
                {c.date_naissance && (
                  <span className="text-muted" style={{ fontSize: '.52rem' }}>{calcAge(c.date_naissance)} ans</span>
                )}
              </div>
            </div>

            <span className="font-medium uppercase text-muted truncate" style={{ fontSize: '.5rem', letterSpacing: '.15em' }}>{c.genre ?? '—'}</span>
            <span className="font-light text-ink tabular-nums" style={{ fontSize: '.72rem' }}>{c.taille ? `${c.taille} cm` : '—'}</span>
            <span className="font-light text-muted truncate" style={{ fontSize: '.65rem' }}>{c.ville ?? '—'}</span>
            <span className="font-light text-muted truncate" style={{ fontSize: '.6rem' }}>{c.disponibilite ?? '—'}</span>
            <span className="font-light text-muted" style={{ fontSize: '.58rem' }}>{date}</span>

            {/* Instagram dot */}
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
