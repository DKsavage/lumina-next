'use client'

// SessionStatusPanel — panneau de suivi des confirmations modèles pour une session.
// Affiche la barre de progression confirmés/total, les filtres par statut, et la liste détaillée.
// Appelé depuis le dashboard après envoi d'une session (sessionId injecté automatiquement).
import { useState, useEffect } from 'react'
import { SessionEditPanel } from '@/components/admin/SessionEditPanel'
// sending — type de relance en cours (null si aucun), protège contre le double-clic

interface ModelStatus {
  id:                 string
  role:               string
  model_prenom:       string
  model_nom:          string | null
  model_email:        string
  token:              string
  status:             'pending' | 'confirmed' | 'cancelled'
  confirmed_at:       string | null
  cancelled_at:       string | null
  cancel_reason:      string | null
  email_delivered_at: string | null
  email_clicked_at:   string | null
  email_bounced_at:   string | null
  payment_amount:     number | null
  group:              { name: string; call_time: string } | null
}

interface Props {
  sessionId:  string
  onClose:    () => void
  onDeleted?: () => void
}

export function SessionStatusPanel({ sessionId, onClose, onDeleted }: Props) {
  const [models,        setModels]        = useState<ModelStatus[]>([])
  const [stats,         setStats]         = useState({ confirmed: 0, cancelled: 0, pending: 0, total: 0 })
  const [maxModels,     setMaxModels]     = useState<number | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
  const [sending,       setSending]       = useState<string | null>(null)
  const [editing,       setEditing]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [addOpen,       setAddOpen]       = useState(false)
  const [addForm,       setAddForm]       = useState({ prenom: '', nom: '', email: '', role: 'Maquillage' })
  const [addSaving,     setAddSaving]     = useState(false)

  useEffect(() => {
    setLoading(true)   // F4 — réinitialiser le spinner quand sessionId change
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(d => { if (d.success) { setModels(d.data); setStats(d.stats); setMaxModels(d.session?.max_models ?? null) } })
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
          {/* Capacité max — indicateur rouge si atteinte ou dépassée */}
          {maxModels !== null && (() => {
            const atCapacity = stats.total >= maxModels
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.6rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: atCapacity ? '#8B0020' : 'rgba(20,120,60,.7)', flexShrink: 0 }} />
                <span style={{ fontSize: '.62rem', color: atCapacity ? '#8B0020' : 'var(--muted)', fontWeight: atCapacity ? 600 : 400 }}>
                  {stats.total}/{maxModels} places · {atCapacity ? 'Capacité atteinte' : `${maxModels - stats.total} place${maxModels - stats.total > 1 ? 's' : ''} restante${maxModels - stats.total > 1 ? 's' : ''}`}
                </span>
              </div>
            )
          })()}
        </div>

        {/* Boutons de relance — J-5/J-2 vers pending, J-1/morning vers confirmés */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['j5', 'j2', 'j1', 'morning', 'merci', 'paiement'] as const).map(type => {
            const labels = { j5: 'Relance J-5', j2: 'Relance J-2 (urgente)', j1: 'Rappel J-1', morning: 'Rappel matin J', merci: 'Remerciement', paiement: 'Paiement envoyé' }
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ fontSize: '.78rem', color: 'var(--ink)', fontWeight: m.status === 'confirmed' ? 600 : 400 }}>{m.model_prenom}</span>
                    {m.role !== 'Mannequinat' && (
                      <span style={{ fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 700, textTransform: 'uppercase', color: '#8B0020', border: '1px solid rgba(139,0,32,.3)', padding: '.1rem .35rem' }}>
                        {m.role}
                      </span>
                    )}
                  </div>
                  {m.group && <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{m.group.name} · {m.group.call_time}</div>}
                  {m.cancel_reason && <div style={{ fontSize: '.62rem', color: '#8B0020', marginTop: '.1rem' }}>Raison : {m.cancel_reason}</div>}
                  {/* Indicateurs tracking email */}
                  <div style={{ display: 'flex', gap: '.4rem', marginTop: '.25rem', flexWrap: 'wrap' }}>
                    {m.email_bounced_at && (
                      <span style={{ fontSize: '.38rem', letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: '#8B0020', padding: '.1rem .35rem' }}>
                        Adresse invalide
                      </span>
                    )}
                    {!m.email_bounced_at && m.email_clicked_at && (
                      <span style={{ fontSize: '.4rem', letterSpacing: '.08em', color: 'rgba(20,120,60,.9)', fontWeight: 600 }}>
                        Lien cliqué · {new Date(m.email_clicked_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {!m.email_bounced_at && !m.email_clicked_at && m.email_delivered_at && (
                      <span style={{ fontSize: '.4rem', letterSpacing: '.08em', color: 'var(--muted)' }}>
                        Livré · {new Date(m.email_delivered_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {!m.email_bounced_at && !m.email_delivered_at && (
                      <span style={{ fontSize: '.4rem', letterSpacing: '.08em', color: 'var(--muted)', opacity: .6 }}>
                        En attente de livraison
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.3rem', flexShrink: 0 }}>
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', textAlign: 'right' }}>
                    {m.confirmed_at && new Date(m.confirmed_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {m.cancelled_at && new Date(m.cancelled_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {/* Montant + lien facture */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <input
                      type="number"
                      defaultValue={m.payment_amount ?? ''}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      onBlur={async e => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value)
                        await fetch(`/api/sessions/models/${m.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ payment_amount: val }),
                        })
                      }}
                      style={{ width: '5rem', fontFamily: "'Montserrat', sans-serif", fontSize: '.62rem', fontWeight: 300, textAlign: 'right', background: 'transparent', border: '1px solid var(--border)', outline: 'none', padding: '.2rem .4rem', color: 'var(--ink)' }}
                    />
                    <span style={{ fontSize: '.55rem', color: 'var(--muted)' }}>$</span>
                    <a
                      href={`/facture/${m.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Voir la facture"
                      style={{ fontSize: '.65rem', color: 'var(--muted)', textDecoration: 'none', lineHeight: 1 }}
                    >
                      ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter participant externe */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '.75rem' }}>
          <button
            type="button"
            onClick={() => setAddOpen(v => !v)}
            style={{ background: 'none', fontSize: '.42rem', letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {addOpen ? '− Fermer' : '+ Ajouter un participant externe'}
          </button>
          {addOpen && (
            <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                <input
                  value={addForm.prenom}
                  onChange={e => setAddForm(f => ({ ...f, prenom: e.target.value }))}
                  placeholder="Prénom *"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.72rem', fontWeight: 300, background: 'transparent', border: '1px solid var(--border)', outline: 'none', padding: '.4rem .6rem', color: 'var(--ink)' }}
                />
                <input
                  value={addForm.nom}
                  onChange={e => setAddForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Nom"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.72rem', fontWeight: 300, background: 'transparent', border: '1px solid var(--border)', outline: 'none', padding: '.4rem .6rem', color: 'var(--ink)' }}
                />
              </div>
              <input
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email *"
                type="email"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.72rem', fontWeight: 300, background: 'transparent', border: '1px solid var(--border)', outline: 'none', padding: '.4rem .6rem', color: 'var(--ink)' }}
              />
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.72rem', fontWeight: 300, background: 'transparent', border: '1px solid var(--border)', outline: 'none', padding: '.4rem .6rem', color: 'var(--ink)', appearance: 'none' }}
              >
                <option value="Maquillage">Maquillage</option>
                <option value="Coiffure">Coiffure</option>
                <option value="Stylisme">Stylisme</option>
                <option value="Photographie">Photographie</option>
                <option value="Vidéographie">Vidéographie</option>
                <option value="Direction artistique">Direction artistique</option>
                <option value="Retouche">Retouche</option>
                <option value="Autre">Autre</option>
              </select>
              <button
                type="button"
                disabled={addSaving || !addForm.prenom || !addForm.email}
                onClick={async () => {
                  setAddSaving(true)
                  try {
                    const res = await fetch('/api/sessions/participants', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ session_id: sessionId, ...addForm }),
                    })
                    if (!res.ok) { alert('Erreur lors de l\'ajout.'); return }
                    setAddForm({ prenom: '', nom: '', email: '', role: 'Maquillage' })
                    setAddOpen(false)
                    // Recharger la liste
                    const d = await fetch(`/api/sessions/${sessionId}`).then(r => r.json())
                    if (d.success) { setModels(d.data); setStats(d.stats) }
                  } finally {
                    setAddSaving(false)
                  }
                }}
                style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '.5rem', fontSize: '.42rem', letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase', cursor: addSaving || !addForm.prenom || !addForm.email ? 'not-allowed' : 'pointer', opacity: addSaving || !addForm.prenom || !addForm.email ? .5 : 1 }}
              >
                {addSaving ? '…' : 'Ajouter'}
              </button>
            </div>
          )}
        </div>

        {/* Total paiements */}
        {models.some(m => m.payment_amount !== null) && (() => {
          const total = models.reduce((sum, m) => sum + (m.payment_amount ?? 0), 0)
          return (
            <div style={{ marginTop: '1rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.55rem', letterSpacing: '.18em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)' }}>Total paiements</span>
              <span style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                {total.toFixed(2)} $
              </span>
            </div>
          )
        })()}
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
