// FloatingBar — spring up/down, thumbnails empilés, layout ink mat.
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Candidature } from '@/types/candidature'

interface Props {
  selectedCount:     number
  selectedBreakdown: string
  selectedItems?:    Candidature[]
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
  selectedCount, selectedBreakdown, selectedItems = [],
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
                <Image
                  src={item.photo_profil_signed}
                  alt=""
                  fill
                  unoptimized
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                  sizes="28px"
                />
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
      <div style={{ display: 'flex', gap: '.3rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
