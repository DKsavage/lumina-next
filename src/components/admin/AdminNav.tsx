'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  newCount:       number
  onRefresh:      () => void
  onExportCSV:    () => void
  onLogout:       () => void
  onNewSession:   () => void
  onSearch:       () => void
  loading:        boolean
}

export function AdminNav({ newCount, onRefresh, onExportCSV, onLogout, onNewSession, onSearch, loading }: Props) {
  const [isPressed, setIsPressed] = useState(false)
  const pathname = usePathname()

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
          F
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
                color: pathname === link.href ? 'rgba(247,243,238,.95)' : 'rgba(247,243,238,.35)',
                background: pathname === link.href ? 'rgba(255,255,255,.11)' : 'transparent',
                transition: 'background-color .3s var(--spring), color .3s var(--spring), transform .15s var(--spring)',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginLeft: 'auto', flexShrink: 0, paddingRight: '.1rem' }}>
          {/* Recherche ⌘K */}
          <button
            onClick={onSearch}
            style={{ height: 30, borderRadius: '100px', background: 'rgba(255,255,255,.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem', padding: '0 .65rem', transition: 'background-color .2s' }}
            aria-label="Rechercher (⌘K)"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.07)' }}
          >
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="rgba(247,243,238,.5)" strokeWidth="1.6">
              <circle cx="9" cy="9" r="6"/><path d="M14 14l3.5 3.5" strokeLinecap="round"/>
            </svg>
            <kbd style={{ fontSize: '.38rem', color: 'rgba(247,243,238,.3)', fontFamily: 'inherit', letterSpacing: '.04em', background: 'none', border: 'none', padding: 0 }}>⌘K</kbd>
          </button>

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
                background: 'var(--color-red)', border: '1.5px solid #1A1410',
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
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            style={{
              height: 30, borderRadius: '100px', padding: '0 .45rem 0 .7rem',
              background: 'var(--red)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '.35rem',
              boxShadow: '0 1px 6px rgba(139,0,32,.35), 0 1px 0 rgba(255,255,255,.15) inset',
              transition: 'transform .25s var(--spring-fast)',
              transform: isPressed ? 'scale(0.96)' : 'scale(1)',
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
