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

export function CandidatureCard({ c, selected, isDuplicate = false, onToggle, onViewDetail, onTierChange, style: cardStyle }: Props) {
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
      onClick={() => onToggle(c.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...outerStyle, ...cardStyle }}
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

          {/* Select dot top-left — bouton réel pour clavier/lecteur d'écran */}
          <button
            type="button"
            aria-label={selected ? `Désélectionner ${c.prenom} ${c.nom}` : `Sélectionner ${c.prenom} ${c.nom}`}
            aria-pressed={selected}
            onClick={e => { e.stopPropagation(); onToggle(c.id) }}
            style={{
              position: 'absolute', top: 8, left: 8,
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: selected ? (isAmb ? '#C4973A' : 'var(--red)') : 'rgba(247,243,238,.25)',
              border: selected ? `1.5px solid #fff` : `1.5px solid rgba(255,255,255,.5)`,
              boxShadow: selected ? (isAmb ? '0 2px 6px rgba(196,151,58,.4)' : '0 2px 6px rgba(139,0,32,.35)') : 'none',
              transition: 'background .2s var(--spring), border-color .2s var(--spring), box-shadow .2s var(--spring)',
              cursor: 'pointer',
            }}
          >
            {selected && (
              <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

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
