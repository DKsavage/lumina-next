// CandidatureCard — carte individuelle dans la grille du dashboard.
// Affiche photo profil/body (hover), badges sélection et notification.
// Ne contient aucune logique API ni état global.
'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { Candidature } from '@/types/candidature'
import { TIER_CONFIG, type Tier } from '@/components/admin/tierConfig'

interface Props {
  c:               Candidature
  selected:        boolean
  isDuplicate?:    boolean
  onToggle:        (id: string) => void
  onViewDetail:    (c: Candidature) => void
  onTierChange:    (id: string, tier: Tier | null) => void
}

export function CandidatureCard({ c, selected, isDuplicate = false, onToggle, onViewDetail, onTierChange }: Props) {
  const [hovered,   setHovered]   = useState(false)
  const [tierOpen,  setTierOpen]  = useState(false)
  const tierRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tierOpen) return
    function close(e: MouseEvent) {
      if (tierRef.current && !tierRef.current.contains(e.target as Node)) setTierOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [tierOpen])
  const date      = new Date(c.date_inscription).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  const activeSrc = hovered && c.photo_body_signed ? c.photo_body_signed : c.photo_profil_signed

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onToggle(c.id)}
      onKeyDown={e => {
        // Permettre la sélection au clavier — Space évite le scroll de page
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(c.id)
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer transition-all duration-300"
      style={{
        border:     selected ? '1px solid var(--red)' : '1px solid var(--border)',
        background: selected ? 'rgba(139,0,32,.03)' : 'var(--paper)',
        userSelect: 'none',
      }}
    >
      {/* Photo */}
      <div className="relative overflow-hidden bg-[#E8E3DC]" style={{ aspectRatio: '3/4' }}>
        {activeSrc ? (
          <Image
            src={activeSrc}
            alt={`${c.prenom} ${c.nom}`}
            fill
            className="object-cover object-top transition-opacity duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '3rem', color: 'rgba(139,0,32,.18)' }}>
              {c.prenom[0]}{c.nom[0]}
            </span>
          </div>
        )}

        {/* Badge "Full body" visible au repos */}
        {c.photo_body_signed && !selected && (
          <div
            className="absolute bottom-2 right-2 font-medium uppercase"
            style={{ fontSize: '.38rem', letterSpacing: '.18em', background: 'rgba(12,11,9,.45)', color: 'rgba(247,243,238,.8)', padding: '.2rem .45rem', opacity: hovered ? 0 : 1, transition: 'opacity .2s' }}
          >
            Full body
          </div>
        )}

        {/* Checkmark sélection */}
        {selected && (
          <div
            className="absolute top-2 right-2 flex items-center justify-center"
            style={{ width: '1.6rem', height: '1.6rem', background: 'var(--red)', borderRadius: '50%' }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Badge "Notifié" */}
        {c.selectionne && !selected && (
          <div
            className="absolute top-2 left-2 font-medium uppercase"
            style={{ fontSize: '.36rem', letterSpacing: '.15em', background: 'rgba(20,120,60,.82)', color: '#fff', padding: '.2rem .45rem' }}
          >
            Notifié
          </div>
        )}
        {/* Badge "Doublon" */}
        {isDuplicate && (
          <div
            className="absolute bottom-2 left-2 font-medium uppercase"
            style={{ fontSize: '.36rem', letterSpacing: '.15em', background: 'rgba(200,100,0,.85)', color: '#fff', padding: '.2rem .45rem' }}
          >
            Doublon
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ padding: '1rem 1rem .9rem' }}>
        <div className="text-ink font-medium mb-1 truncate" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.78rem', letterSpacing: '.01em' }}>
          {c.prenom} {c.nom}
        </div>
        <div className="text-muted font-light truncate" style={{ fontSize: '.62rem', marginBottom: '.5rem' }}>{c.email}</div>
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '.5rem' }}>
          {c.genre && (
            <span className="font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.25em', border: '1px solid var(--border)', padding: '.2rem .5rem' }}>
              {c.genre}
            </span>
          )}
          {c.taille && <span className="text-muted font-light tabular-nums" style={{ fontSize: '.62rem' }}>{c.taille} cm</span>}
        </div>
        <div className="flex items-center justify-between">
          {/* Badge tier — dropdown inline au clic */}
          <div ref={tierRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setTierOpen(v => !v) }}
              style={{
                background: c.tier ? TIER_CONFIG[c.tier].bg : 'transparent',
                color:      c.tier ? TIER_CONFIG[c.tier].color : 'var(--muted)',
                border:     `1px solid ${c.tier ? TIER_CONFIG[c.tier].border : 'var(--border)'}`,
                fontSize: '.38rem', letterSpacing: '.14em', fontWeight: 600,
                padding: '.18rem .45rem', cursor: 'pointer',
              }}
            >
              {c.tier ? TIER_CONFIG[c.tier].label : '+ Tier'}
            </button>
            {tierOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, zIndex: 50,
                background: 'var(--paper)', border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,.1)', minWidth: '110px', marginBottom: '4px',
              }}>
                {(Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG[Tier]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={e => { e.stopPropagation(); onTierChange(c.id, key); setTierOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '.4rem .7rem', fontSize: '.42rem', letterSpacing: '.12em',
                      fontWeight: 600, color: cfg.color, background: c.tier === key ? cfg.bg : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    {cfg.label} {c.tier === key ? '✓' : ''}
                  </button>
                ))}
                {c.tier && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onTierChange(c.id, null); setTierOpen(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.4rem .7rem', fontSize: '.4rem', letterSpacing: '.1em', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Retirer
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onViewDetail(c) }}
            className="text-muted transition-colors duration-200 hover:text-red"
            style={{ background: 'none', fontSize: '.7rem', lineHeight: 1, padding: '.2rem' }}
            aria-label="Voir le profil"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
