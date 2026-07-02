'use client'

import { useState, useRef, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const SITE_URL = 'https://luminamodels.ca'

export default function ShareButton() {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer le popup en cliquant en dehors
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleCopy() {
    await navigator.clipboard.writeText(SITE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Flawa Models — Casting 2026', url: SITE_URL })
    } else {
      handleCopy()
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Partager le lien d'inscription"
        style={{
          background: 'none',
          border: '1px solid rgba(247,243,238,.25)',
          color: 'rgba(247,243,238,.7)',
          fontFamily: 'var(--font-montserrat)',
          fontSize: '.48rem',
          fontWeight: 500,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          padding: '.35rem .8rem',
          cursor: 'pointer',
          transition: 'border-color .2s, color .2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(247,243,238,.6)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(247,243,238,1)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(247,243,238,.25)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(247,243,238,.7)'
        }}
      >
        Partager
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + .75rem)',
            right: 0,
            background: '#F7F3EE',
            border: '1px solid rgba(26,20,16,.08)',
            borderRadius: '.75rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '.85rem',
            boxShadow: '0 8px 32px rgba(26,20,16,.12)',
            zIndex: 600,
            minWidth: '180px',
          }}
        >
          {/* QR code */}
          <div
            style={{
              background: '#fff',
              padding: '.75rem',
              borderRadius: '.5rem',
              border: '1px solid rgba(139,0,32,.08)',
            }}
          >
            <QRCodeSVG value={SITE_URL} size={140} fgColor="#1a1a1a" bgColor="#ffffff" level="M" />
          </div>

          {/* URL */}
          <p style={{
            fontFamily: 'var(--font-montserrat)',
            fontSize: '.42rem',
            letterSpacing: '.12em',
            color: '#8B0020',
            fontWeight: 300,
          }}>
            luminamodels.ca
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', width: '100%' }}>
            <button
              onClick={handleShare}
              style={{
                background: '#1A1410',
                color: '#F7F3EE',
                border: 'none',
                borderRadius: '.35rem',
                padding: '.45rem',
                fontFamily: 'var(--font-montserrat)',
                fontSize: '.44rem',
                fontWeight: 500,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {typeof navigator !== 'undefined' && 'share' in navigator ? 'Partager ↗' : 'Copier le lien'}
            </button>
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                color: copied ? '#2E7D32' : '#9A8F84',
                border: '1px solid rgba(26,20,16,.1)',
                borderRadius: '.35rem',
                padding: '.4rem',
                fontFamily: 'var(--font-montserrat)',
                fontSize: '.44rem',
                fontWeight: 400,
                letterSpacing: '.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </button>
            <a
              href="/qr"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                color: '#9A8F84',
                fontFamily: 'var(--font-montserrat)',
                fontSize: '.4rem',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                paddingTop: '.2rem',
              }}
            >
              Version imprimable ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
