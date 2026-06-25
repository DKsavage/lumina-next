'use client'

import { useState } from 'react'

interface Props {
  token:   string
  prenom:  string
}

const BTN_BASE: React.CSSProperties = {
  flex: 1, minWidth: '140px', display: 'block', textAlign: 'center',
  padding: '1rem', fontWeight: 700, fontSize: '.85rem', textDecoration: 'none',
  letterSpacing: '.1em', fontFamily: 'Arial, sans-serif', cursor: 'pointer', border: 'none',
}

export function ConfirmActions({ token, prenom }: Props) {
  const [cancelling, setCancelling] = useState(false)
  const [reason,     setReason]     = useState('')

  const cancelHref = `/api/confirm?token=${encodeURIComponent(token)}&status=cancelled${reason.trim() ? `&reason=${encodeURIComponent(reason.trim())}` : ''}`

  if (cancelling) {
    return (
      <div>
        <p style={{ fontSize: '.9rem', color: '#0c0b09', marginBottom: '1rem', lineHeight: 1.7 }}>
          Désolé de l'apprendre, <strong>{prenom}</strong>. Voulez-vous nous indiquer la raison ?
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif (optionnel)"
          maxLength={500}
          rows={3}
          style={{
            width: '100%', padding: '.75rem', fontSize: '.9rem', lineHeight: 1.6,
            border: '1px solid #e0e0e0', resize: 'vertical', fontFamily: 'Arial, sans-serif',
            color: '#0c0b09', background: '#fff', marginBottom: '1rem', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href={cancelHref}
            style={{ ...BTN_BASE, background: '#8B0020', color: '#fff' }}
          >
            Confirmer l'annulation
          </a>
          <button
            type="button"
            onClick={() => setCancelling(false)}
            style={{ ...BTN_BASE, background: '#fff', color: '#6b6b6b', border: '1px solid #e0e0e0' }}
          >
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <p style={{ fontSize: '.9rem', color: '#0c0b09', marginBottom: '1.2rem', lineHeight: 1.7 }}>
        Bonjour <strong>{prenom}</strong>, pouvez-vous confirmer votre présence ?
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <a
          href={`/api/confirm?token=${encodeURIComponent(token)}&status=confirmed`}
          style={{ ...BTN_BASE, background: '#8B0020', color: '#fff' }}
        >
          ✓ Je confirme
        </a>
        <button
          type="button"
          onClick={() => setCancelling(true)}
          style={{ ...BTN_BASE, background: '#fff', color: '#6b6b6b', border: '1px solid #e0e0e0' }}
        >
          Je ne peux pas venir
        </button>
      </div>
    </>
  )
}
