// SessionComposer — modale de composition d'une session photo (email aux modèles sélectionnés).
// Gère son propre état de formulaire. Le parent fournit onSubmit et onClose.
'use client'

import { useState, type FormEvent } from 'react'
import { type SessionForm, type Group, defaultSession } from '@/types/candidature'

interface Props {
  selectedCount: number
  onClose:       () => void
  onSubmit:      (session: SessionForm) => Promise<void>
  sending:       boolean
}

const inputStyle: React.CSSProperties = {
  fontFamily:    "'Montserrat', sans-serif",
  fontWeight:    200,
  fontSize:      '.85rem',
  background:    'transparent',
  color:         'var(--ink)',
  outline:       'none',
  width:         '100%',
  borderBottom:  '1px solid var(--border)',
  paddingBottom: '.6rem',
  marginBottom:  '1.5rem',
}

export function SessionComposer({ selectedCount, onClose, onSubmit, sending }: Props) {
  const [session, setSession] = useState<SessionForm>(defaultSession)

  function update<K extends keyof SessionForm>(key: K, val: SessionForm[K]) {
    setSession(prev => ({ ...prev, [key]: val }))
  }

  function updateGroup(i: number, field: keyof Group, val: string) {
    setSession(prev => {
      const groups = [...prev.groups]
      groups[i] = { ...groups[i], [field]: val }
      return { ...prev, groups }
    })
  }

  function addGroup()            { setSession(prev => ({ ...prev, groups: [...prev.groups, { name: '', time: '', members: '' }] })) }
  function removeGroup(i: number){ setSession(prev => ({ ...prev, groups: prev.groups.filter((_, idx) => idx !== i) })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onSubmit(session)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(12,11,9,.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-xl overflow-y-auto bg-paper"
        style={{ maxHeight: '90dvh', borderRadius: '1rem 1rem 0 0', padding: '2rem', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.5rem', color: 'var(--ink)' }}>
              Composer une session
            </div>
            <div className="text-muted font-medium uppercase mt-1" style={{ fontSize: '.44rem', letterSpacing: '.25em' }}>
              {selectedCount} modèle{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} className="text-muted transition-colors duration-200 hover:text-red" style={{ background: 'none', fontSize: '1.2rem', lineHeight: 1 }} aria-label="Fermer">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Nom du projet *</label>
          <input required value={session.project} onChange={e => update('project', e.target.value)} placeholder="Ex: Campagne Printemps 2026" style={inputStyle} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Date (FR) *</label>
              <input required value={session.dateFr} onChange={e => update('dateFr', e.target.value)} placeholder="jeudi 12 juin 2026" style={inputStyle} />
            </div>
            <div>
              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Date (EN)</label>
              <input value={session.dateEn} onChange={e => update('dateEn', e.target.value)} placeholder="Thursday, June 12, 2026" style={inputStyle} />
            </div>
          </div>

          <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Adresse *</label>
          <input required value={session.addressFr} onChange={e => update('addressFr', e.target.value)} placeholder="123 rue Sainte-Catherine, Montréal" style={inputStyle} />

          <div className="flex items-center justify-between mb-3">
            <label className="font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Groupes (call times)</label>
            <button type="button" onClick={addGroup} className="font-medium uppercase text-red transition-opacity duration-200 hover:opacity-70" style={{ background: 'none', fontSize: '.44rem', letterSpacing: '.25em' }}>+ Ajouter</button>
          </div>
          {session.groups.map((g, i) => (
            <div key={i} className="grid gap-2 mb-3" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end' }}>
              <input value={g.name}    onChange={e => updateGroup(i, 'name',    e.target.value)} placeholder="Groupe A" style={{ ...inputStyle, marginBottom: 0 }} />
              <input value={g.time}    onChange={e => updateGroup(i, 'time',    e.target.value)} placeholder="10h00"    style={{ ...inputStyle, marginBottom: 0 }} />
              <input value={g.members} onChange={e => updateGroup(i, 'members', e.target.value)} placeholder="Membres"  style={{ ...inputStyle, marginBottom: 0 }} />
              {session.groups.length > 1 && (
                <button type="button" onClick={() => removeGroup(i)} className="text-muted transition-colors duration-200 hover:text-red" style={{ background: 'none', paddingBottom: '.6rem', fontSize: '.9rem' }}>×</button>
              )}
            </div>
          ))}

          <div style={{ height: '1rem' }} />
          <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Notes (FR)</label>
          <textarea value={session.notesFr} onChange={e => update('notesFr', e.target.value)} rows={2} placeholder="Instructions supplémentaires en français…" style={{ ...inputStyle, resize: 'none' }} />
          <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Notes (EN)</label>
          <textarea value={session.notesEn} onChange={e => update('notesEn', e.target.value)} rows={2} placeholder="Additional instructions in English…" style={{ ...inputStyle, resize: 'none' }} />

          <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>Lien WhatsApp</label>
          <input type="url" value={session.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="https://chat.whatsapp.com/…" style={inputStyle} />

          <div className="flex gap-6 mb-8">
            {([['unpaid','Participation non rémunérée'],['moodboard','Moodboard joint']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={session[key] as boolean} onChange={e => update(key, e.target.checked)} className="accent-red w-3 h-3" />
                <span className="font-light text-ink" style={{ fontSize: '.72rem' }}>{label}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full font-medium uppercase text-paper transition-opacity duration-200"
            style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.58rem', letterSpacing: '.3em', background: 'var(--red)', padding: '1rem', opacity: sending ? .6 : 1, cursor: sending ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'Envoi en cours…' : `Envoyer à ${selectedCount} modèle${selectedCount > 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}
