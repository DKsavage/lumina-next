'use client'

// SessionStatusPanel — panneau de suivi des confirmations modèles pour une session.
// Affiche la barre de progression confirmés/total, les filtres par statut, et la liste détaillée.
// Appelé depuis le dashboard après envoi d'une session (sessionId injecté automatiquement).
import { useState, useEffect } from 'react'
import { SessionEditPanel } from '@/components/admin/SessionEditPanel'
// sending — type de relance en cours (null si aucun), protège contre le double-clic

interface ModelStatus {
  id: string
  model_prenom: string
  model_email:  string
  status:       'pending' | 'confirmed' | 'cancelled'
  confirmed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  group: { name: string; call_time: string } | null
}

interface Props {
  sessionId:  string
  onClose:    () => void
  onDeleted?: () => void
}

export function SessionStatusPanel({ sessionId, onClose, onDeleted }: Props) {
  const [models,        setModels]        = useState<ModelStatus[]>([])
  const [stats,         setStats]         = useState({ confirmed: 0, cancelled: 0, pending: 0, total: 0 })
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
  const [sending,       setSending]       = useState<string | null>(null)
  const [editing,       setEditing]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  useEffect(() => {
    setLoading(true)   // F4 — réinitialiser le spinner quand sessionId change
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(d => { if (d.success) { setModels(d.data); setStats(d.stats) } })
      .finally(() => setLoading(false))
  }, [sessionId])

  const visible = models.filter(m => filter === 'all' || m.status === filter)

  return (
    <>
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(12,11,9,.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-lg bg-paper overflow-y-auto"
        style={{ maxHeight: '85dvh', borderRadius: '1rem 1rem 0 0', padding: '2rem', borderTop: '1px solid var(--border)' }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Suivi des confirmations
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', fontSize: '.5rem', letterSpacing: '.2em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.3rem .8rem', cursor: 'pointer' }}
            >
              Éditer
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', fontSize: '.5rem', letterSpacing: '.2em', fontWeight: 600, textTransform: 'uppercase', color: '#8B0020', border: '1px solid rgba(139,0,32,.3)', padding: '.3rem .8rem', cursor: 'pointer' }}
              >
                Supprimer
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '.5rem', color: '#8B0020', fontWeight: 600, letterSpacing: '.1em' }}>Confirmer ?</span>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
                      if (!res.ok) { alert('Erreur lors de la suppression.'); return }
                      onDeleted?.()
                      onClose()
                    } finally {
                      setDeleting(false)
                    }
                  }}
                  style={{ background: '#8B0020', color: '#fff', fontSize: '.5rem', letterSpacing: '.2em', fontWeight: 600, textTransform: 'uppercase', border: 'none', padding: '.3rem .8rem', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? .6 : 1 }}
                >
                  {deleting ? '…' : 'Oui, supprimer'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ background: 'none', fontSize: '.5rem', letterSpacing: '.2em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.3rem .8rem', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
            )}
            <button onClick={onClose} style={{ background: 'none', fontSize: '1.2rem', color: 'var(--muted)' }}>×</button>
          </div>
        </div>

        {/* Barre de progression — ratio confirmés/total */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--ink)', fontWeight: 600 }}>{stats.confirmed}/{stats.total} confirmés</span>
            <span style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{stats.cancelled} annulé{stats.cancelled > 1 ? 's' : ''} · {stats.pending} en attente</span>
          </div>
          <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.total ? (stats.confirmed / stats.total) * 100 : 0}%`, background: 'rgba(20,120,60,.7)', transition: 'width .4s ease' }} />
          </div>
        </div>

        {/* Boutons de relance — J-5/J-2 vers pending, J-1/morning vers confirmés */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['j5', 'j2', 'j1', 'morning'] as const).map(type => {
            const labels = { j5: 'Relance J-5', j2: 'Relance J-2 (urgente)', j1: 'Rappel J-1', morning: 'Rappel matin J' }
            return (
              <button
                key={type}
                type="button"
                disabled={sending !== null}
                onClick={async () => {
                  // F2 — garde contre le double-clic : un seul envoi à la fois
                  if (sending) return
                  setSending(type)
                  try {
                    const res = await fetch('/api/sessions/remind', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId, type }),
                    })
                    if (!res.ok) { alert('Erreur lors de l\'envoi — réessayez.'); return }
                    const d = await res.json()
                    alert(`${d.sent} rappel${d.sent > 1 ? 's' : ''} envoyé${d.sent > 1 ? 's' : ''}`)
                  } finally {
                    setSending(null)
                  }
                }}
                style={{ fontSize: '.7rem', letterSpacing: '.18em', fontWeight: 600, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.35rem .8rem', cursor: sending !== null ? 'not-allowed' : 'pointer', opacity: sending !== null ? .5 : 1 }}
              >
                {sending === type ? '…' : labels[type]}
              </button>
            )
          })}
        </div>

        {/* Filtres par statut */}
        <div className="flex gap-1 mb-4">
          {(['all', 'confirmed', 'pending', 'cancelled'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                fontSize: '.65rem',
                letterSpacing: '.15em',
                fontWeight: 600,
                background: filter === f ? 'var(--ink)' : 'transparent',
                color:      filter === f ? 'var(--paper)' : 'var(--muted)',
                border: '1px solid var(--border)',
                padding: '.3rem .7rem',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'Tous' : f === 'confirmed' ? 'Confirmés' : f === 'pending' ? 'En attente' : 'Annulés'}
            </button>
          ))}
        </div>

        {/* Liste des modèles */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>Chargement…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {visible.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '.7rem 1rem',
                  border: '1px solid var(--border)',
                  // Fond subtil selon le statut pour une lecture rapide
                  background: m.status === 'confirmed' ? 'rgba(20,120,60,.04)' : m.status === 'cancelled' ? 'rgba(139,0,32,.04)' : 'transparent',
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                  {m.status === 'confirmed' ? '✓' : m.status === 'cancelled' ? '✗' : '⏳'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.78rem', color: 'var(--ink)', fontWeight: m.status === 'confirmed' ? 600 : 400 }}>{m.model_prenom}</div>
                  {m.group && <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{m.group.name} · {m.group.call_time}</div>}
                  {m.cancel_reason && <div style={{ fontSize: '.62rem', color: '#8B0020', marginTop: '.1rem' }}>Raison : {m.cancel_reason}</div>}
                </div>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', flexShrink: 0, textAlign: 'right' }}>
                  {m.confirmed_at && new Date(m.confirmed_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {m.cancelled_at && new Date(m.cancelled_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

      {editing && (
        <SessionEditPanel
          sessionId={sessionId}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            // Recharger les données du panel après modification
            setLoading(true)
            fetch(`/api/sessions/${sessionId}`)
              .then(r => r.json())
              .then(d => { if (d.success) { setModels(d.data); setStats(d.stats) } })
              .finally(() => setLoading(false))
          }}
        />
      )}
    </>
  )
}
