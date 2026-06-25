'use client'

// SessionEditPanel — formulaire d'édition d'une session déjà envoyée.
// Champs éditables : date, adresse, contact, notes modèles, call time par groupe.
// Optionnellement envoie un email de mise à jour aux modèles confirmés.
import { useState, useEffect } from 'react'

interface Group { id: string; name: string; call_time: string }

interface SessionData {
  project:       string
  date:          string
  address:       string
  contact_name:  string | null
  contact_phone: string | null
  notes_models:  string | null
  session_groups: Group[]
}

interface Props {
  sessionId:   string
  onClose:     () => void
  onSaved:     () => void
}

const INPUT: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
  outline: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
  fontSize: '.9rem', color: 'var(--ink)', paddingBottom: '.5rem', marginBottom: '1.2rem',
  boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '.5rem', letterSpacing: '.28em', fontWeight: 600,
  textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.4rem',
}

export function SessionEditPanel({ sessionId, onClose, onSaved }: Props) {
  const [session,  setSession]  = useState<SessionData | null>(null)
  const [groups,   setGroups]   = useState<Group[]>([])
  const [notify,   setNotify]   = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success || !d.session) return
        setSession(d.session)
        setGroups(d.session.session_groups ?? [])
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:          session.date,
          address:       session.address,
          contact_name:  session.contact_name  || null,
          contact_phone: session.contact_phone || null,
          notes_models:  session.notes_models  || null,
          groups:        groups.map(g => ({ id: g.id, call_time: g.call_time })),
          notify,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message ?? 'Erreur lors de la sauvegarde.'); return }
      onSaved()
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  function field<K extends keyof SessionData>(key: K, val: string) {
    setSession(prev => prev ? { ...prev, [key]: val } : prev)
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(12,11,9,.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-lg bg-paper overflow-y-auto"
        style={{ maxHeight: '90dvh', borderRadius: '1rem 1rem 0 0', padding: '2rem', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Modifier la session
          </div>
          <button onClick={onClose} style={{ background: 'none', fontSize: '1.2rem', color: 'var(--muted)' }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>Chargement…</div>
        ) : !session ? (
          <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Impossible de charger la session.</div>
        ) : (
          <>
            {/* Projet (lecture seule) */}
            <div style={{ marginBottom: '1.5rem', padding: '.75rem 1rem', background: 'rgba(0,0,0,.03)', fontSize: '.78rem', color: 'var(--muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{session.project}</span>
            </div>

            <label style={LABEL}>Date</label>
            <input type="date" value={session.date} onChange={e => field('date', e.target.value)} style={INPUT} />

            <label style={LABEL}>Lieu / adresse</label>
            <input type="text" value={session.address} onChange={e => field('address', e.target.value)} style={INPUT} placeholder="Adresse complète" />

            <label style={LABEL}>Contact sur place</label>
            <input type="text" value={session.contact_name ?? ''} onChange={e => field('contact_name', e.target.value)} style={{ ...INPUT, marginBottom: '.5rem' }} placeholder="Nom" />
            <input type="tel" value={session.contact_phone ?? ''} onChange={e => field('contact_phone', e.target.value)} style={INPUT} placeholder="Téléphone" />

            <label style={LABEL}>Notes pour les modèles</label>
            <textarea
              value={session.notes_models ?? ''}
              onChange={e => field('notes_models', e.target.value)}
              rows={3}
              style={{ ...INPUT, resize: 'vertical', borderBottom: 'none', border: '1px solid var(--border)', padding: '.6rem', marginBottom: '1.5rem' }}
              placeholder="Instructions spéciales, rappels…"
            />

            {/* Call times par groupe */}
            {groups.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={LABEL}>Call times des groupes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {groups
                    .sort((a, b) => 0)  // déjà triés par sort_order côté DB
                    .map((g, i) => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '.72rem', color: 'var(--ink)', fontWeight: 500, minWidth: '6rem', flexShrink: 0 }}>{g.name || `Groupe ${i + 1}`}</span>
                        <input
                          type="text"
                          value={g.call_time}
                          onChange={e => setGroups(prev => prev.map((x, j) => j === i ? { ...x, call_time: e.target.value } : x))}
                          placeholder="ex: 10h30"
                          style={{ ...INPUT, marginBottom: 0, flex: 1 }}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Option notification */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notify}
                onChange={e => setNotify(e.target.checked)}
                style={{ width: '1rem', height: '1rem', accentColor: 'var(--red)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '.72rem', color: 'var(--ink)' }}>Envoyer un email de mise à jour aux modèles <strong>confirmés</strong></span>
            </label>

            {error && (
              <div style={{ fontSize: '.72rem', color: 'var(--red)', marginBottom: '1rem' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '1rem', background: 'var(--red)', color: 'var(--paper)',
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '.6rem',
                  letterSpacing: '.25em', textTransform: 'uppercase',
                  opacity: saving ? .5 : 1, cursor: saving ? 'not-allowed' : 'pointer', border: 'none',
                }}
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '1rem 1.5rem', background: 'transparent', color: 'var(--muted)',
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '.6rem',
                  letterSpacing: '.2em', textTransform: 'uppercase',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
