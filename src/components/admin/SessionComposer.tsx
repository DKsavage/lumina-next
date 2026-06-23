'use client'

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { type SessionForm, type Group, defaultSession } from '@/types/candidature'

interface Props {
  selectedCount: number
  selectedCandidatures: { id: string; prenom: string; nom: string; genre: string | null }[]
  onClose:  () => void
  onSubmit: (session: SessionForm) => Promise<void>
  sending:  boolean
}

const inp: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.85rem',
  background: 'transparent', color: 'var(--ink)', outline: 'none',
  width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '.6rem', marginBottom: '1.4rem',
}

const label = (text: string) => (
  <div className="font-medium uppercase text-muted mb-2" style={{ fontSize: '.42rem', letterSpacing: '.28em' }}>{text}</div>
)

export function SessionComposer({ selectedCount, selectedCandidatures, onClose, onSubmit, sending }: Props) {
  const [session, setSession] = useState<SessionForm>(defaultSession)
  const [tab, setTab]         = useState<'form' | 'assign'>('form')
  const moodboardRef          = useRef<HTMLInputElement>(null)

  function update<K extends keyof SessionForm>(key: K, val: SessionForm[K]) {
    setSession(prev => ({ ...prev, [key]: val }))
  }

  function updateGroup(i: number, field: keyof Omit<Group, 'assignedIds'>, val: string | number | null) {
    setSession(prev => {
      const groups = [...prev.groups]
      groups[i] = { ...groups[i], [field]: val }
      return { ...prev, groups }
    })
  }

  function assignToGroup(groupIdx: number, candidatureIds: string[]) {
    setSession(prev => {
      const groups = prev.groups.map((g, i) => {
        const next = new Set(g.assignedIds)
        candidatureIds.forEach(id => {
          if (i === groupIdx) next.add(id)
          else next.delete(id)  // retire des autres groupes
        })
        return { ...g, assignedIds: next }
      })
      return { ...prev, groups }
    })
  }

  function addGroup() {
    setSession(prev => ({
      ...prev,
      groups: [...prev.groups, { name: '', call_time: '', duration_min: null, look_brief: '', bring_items: '', assignedIds: new Set() }],
    }))
  }

  function removeGroup(i: number) {
    setSession(prev => ({ ...prev, groups: prev.groups.filter((_, idx) => idx !== i) }))
  }

  // Formate "2026-06-12" → { fr: "vendredi 12 juin 2026", en: "Friday, June 12, 2026" }
  function formatDate(iso: string) {
    if (!iso) return { fr: '', en: '' }
    const d = new Date(iso + 'T12:00:00')
    return {
      fr: d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      en: d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onSubmit(session)
  }

  const dateFormatted = formatDate(session.date)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(12,11,9,.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-2xl overflow-y-auto bg-paper"
        style={{ maxHeight: '92dvh', borderRadius: '1rem 1rem 0 0', padding: '2rem', borderTop: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.5rem', color: 'var(--ink)' }}>
              Composer une session
            </div>
            <div className="text-muted font-medium uppercase mt-1" style={{ fontSize: '.42rem', letterSpacing: '.25em' }}>
              {selectedCount} modèle{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', fontSize: '1.2rem', color: 'var(--muted)' }} aria-label="Fermer">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {(['form', 'assign'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="font-medium uppercase transition-colors duration-200"
              style={{
                fontSize: '.42rem', letterSpacing: '.25em', background: 'none',
                color: tab === t ? 'var(--ink)' : 'var(--muted)',
                borderBottom: tab === t ? '2px solid var(--red)' : '2px solid transparent',
                padding: '.5rem 1rem', marginBottom: '-1px',
              }}
            >
              {t === 'form' ? 'Détails session' : `Assigner modèles (${session.groups.reduce((n, g) => n + g.assignedIds.size, 0)}/${selectedCount})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'form' && (
            <>
              {/* Projet + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Nom du projet *')}
                  <input required value={session.project} onChange={e => update('project', e.target.value)} placeholder="Campagne Printemps 2026" style={inp} />
                </div>
                <div>
                  {label('Type de shoot')}
                  <select value={session.type} onChange={e => update('type', e.target.value as SessionForm['type'])} style={{ ...inp, appearance: 'none' }}>
                    <option value="photo">📷 Photo</option>
                    <option value="video">🎬 Vidéo</option>
                    <option value="hybrid">📷🎬 Hybride</option>
                  </select>
                </div>
              </div>

              {/* Date — picker unique, auto-formaté */}
              {label('Date *')}
              <input required type="date" value={session.date} onChange={e => update('date', e.target.value)} style={inp} />
              {session.date && (
                <div className="text-muted font-light" style={{ fontSize: '.68rem', marginTop: '-1.2rem', marginBottom: '1.4rem' }}>
                  FR : {dateFormatted.fr} · EN : {dateFormatted.en}
                </div>
              )}

              {/* Adresse + Accès */}
              {label('Adresse *')}
              <input required value={session.address} onChange={e => update('address', e.target.value)} placeholder="555 rue Chabanel, Montréal" style={inp} />
              {label('Instructions d\'accès')}
              <input value={session.access_instructions} onChange={e => update('access_instructions', e.target.value)} placeholder="Sonner #201, parking inclus, ascenseur à droite" style={inp} />

              {/* Contact sur place */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Contact sur place — Prénom')}
                  <input value={session.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="Marie" style={inp} />
                </div>
                <div>
                  {label('Numéro de téléphone')}
                  <input type="tel" value={session.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="514-555-0123" style={inp} />
                </div>
              </div>

              {/* Groupes */}
              <div className="flex items-center justify-between mb-3">
                {label('Groupes & call times')}
                <button type="button" onClick={addGroup} style={{ background: 'none', fontSize: '.42rem', letterSpacing: '.25em', color: 'var(--red)', fontWeight: 600 }}>+ Groupe</button>
              </div>
              {session.groups.map((g, i) => (
                <div key={i} className="mb-4 p-3" style={{ border: '1px solid var(--border)', borderLeft: `3px solid hsl(${i * 60}, 60%, 40%)` }}>
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 80px 80px auto', alignItems: 'end' }}>
                    <input value={g.name} onChange={e => updateGroup(i, 'name', e.target.value)} placeholder={`Groupe ${String.fromCharCode(65 + i)}`} style={{ ...inp, marginBottom: 0 }} />
                    <input value={g.call_time} onChange={e => updateGroup(i, 'call_time', e.target.value)} placeholder="10h00" style={{ ...inp, marginBottom: 0 }} />
                    <input type="number" value={g.duration_min ?? ''} onChange={e => updateGroup(i, 'duration_min', e.target.value ? Number(e.target.value) : null)} placeholder="min" style={{ ...inp, marginBottom: 0 }} />
                    {session.groups.length > 1 && (
                      <button type="button" onClick={() => removeGroup(i)} style={{ background: 'none', color: 'var(--muted)', fontSize: '.9rem', paddingBottom: '.6rem' }}>×</button>
                    )}
                  </div>
                  <input value={g.look_brief} onChange={e => updateGroup(i, 'look_brief', e.target.value)} placeholder="Brief look (ex: tenues neutres, tons terre)" style={{ ...inp, marginBottom: '.5rem', fontSize: '.78rem' }} />
                  <input value={g.bring_items} onChange={e => updateGroup(i, 'bring_items', e.target.value)} placeholder="Apporter : 2 hauts propres, talons noirs min. 8cm" style={{ ...inp, marginBottom: 0, fontSize: '.78rem' }} />
                </div>
              ))}

              {/* Préparation */}
              {label('Instructions de préparation')}
              <input value={session.prep_notes} onChange={e => update('prep_notes', e.target.value)} placeholder="Cheveux propres, ongles neutres, pas de parfum fort" style={inp} />

              {/* Équipe présente */}
              {label('Équipe présente')}
              <div className="flex flex-wrap gap-4 mb-5">
                {(['makeup', 'hair', 'stylist', 'photo'] as const).map(k => {
                  const labels = { makeup: 'Maquilleur·se', hair: 'Coiffeur·se', stylist: 'Styliste', photo: 'Photographe' }
                  return (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={session.team[k]} onChange={e => update('team', { ...session.team, [k]: e.target.checked })} className="accent-red w-3 h-3" />
                      <span className="font-light text-ink" style={{ fontSize: '.72rem' }}>{labels[k]}</span>
                    </label>
                  )
                })}
              </div>

              {/* Compensation */}
              {label('Compensation')}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select value={session.compensation_type} onChange={e => update('compensation_type', e.target.value as SessionForm['compensation_type'])} style={{ ...inp, appearance: 'none' }}>
                    <option value="tfp">TFP (non rémunéré)</option>
                    <option value="paid">Rémunéré</option>
                    <option value="expenses">Défraiement</option>
                  </select>
                </div>
                {session.compensation_type === 'paid' && (
                  <input value={session.compensation_amount} onChange={e => update('compensation_amount', e.target.value)} placeholder="Montant (ex: 150$)" style={inp} />
                )}
              </div>
              {session.compensation_type !== 'tfp' && (
                <div className="grid grid-cols-2 gap-4">
                  <input value={session.compensation_method} onChange={e => update('compensation_method', e.target.value)} placeholder="Mode : cash / virement / PayPal" style={inp} />
                  <input value={session.compensation_delay} onChange={e => update('compensation_delay', e.target.value)} placeholder="Délai : sur place / sous 30 jours" style={inp} />
                </div>
              )}

              {/* Moodboard */}
              {label('URL Moodboard')}
              <input type="url" value={session.moodboard_url} onChange={e => update('moodboard_url', e.target.value)} placeholder="https://drive.google.com/… ou lien Pinterest" style={inp} />

              {/* Notes internes (fond jaune) */}
              {label('Notes internes (non envoyées aux modèles)')}
              <textarea
                value={session.notes_internal}
                onChange={e => update('notes_internal', e.target.value)}
                rows={2}
                placeholder="Infos équipe uniquement…"
                style={{ ...inp, resize: 'none', background: 'rgba(255,220,0,.08)', padding: '.5rem', borderBottom: 'none', border: '1px dashed rgba(200,160,0,.3)' }}
              />

              {/* Notes modèles */}
              {label('Notes pour les modèles')}
              <textarea value={session.notes_models} onChange={e => update('notes_models', e.target.value)} rows={2} placeholder="Instructions supplémentaires visibles dans l'email…" style={{ ...inp, resize: 'none' }} />

              {/* WhatsApp */}
              {label('Lien groupe WhatsApp')}
              <input type="url" value={session.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="https://chat.whatsapp.com/…" style={inp} />

              {/* Deadline confirmation */}
              {label('Délai de confirmation (jours avant le shoot)')}
              <input
                type="number" min={1} max={14}
                value={session.cancel_deadline_days}
                onChange={e => update('cancel_deadline_days', Number(e.target.value))}
                style={{ ...inp, width: '80px' }}
              />
            </>
          )}

          {/* Onglet assignation — GroupAssignmentPanel (Task 4) */}
          {tab === 'assign' && (
            <GroupAssignmentPanelInline
              groups={session.groups}
              candidatures={selectedCandidatures}
              onAssign={assignToGroup}
            />
          )}

          {/* Footer */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '.9rem', fontFamily: "'Montserrat', sans-serif", fontSize: '.52rem', letterSpacing: '.28em', fontWeight: 600, cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending || tab === 'assign'}
              style={{ flex: 2, background: 'var(--red)', color: 'var(--paper)', padding: '.9rem', fontFamily: "'Montserrat', sans-serif", fontSize: '.52rem', letterSpacing: '.28em', fontWeight: 600, opacity: sending ? .6 : 1, cursor: sending ? 'not-allowed' : 'pointer' }}
            >
              {sending ? 'Envoi…' : `Envoyer à ${selectedCount} modèle${selectedCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Inline — sera extrait en Task 4
function GroupAssignmentPanelInline({
  groups,
  candidatures,
  onAssign,
}: {
  groups: Group[]
  candidatures: { id: string; prenom: string; nom: string; genre: string | null }[]
  onAssign: (groupIdx: number, ids: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<'all' | 'unassigned'>('unassigned')

  const assignedAnywhere = new Set(groups.flatMap(g => [...g.assignedIds]))

  const visible = candidatures.filter(c =>
    filter === 'all' ? true : !assignedAnywhere.has(c.id)
  )

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function assignSelected(groupIdx: number) {
    onAssign(groupIdx, [...selected])
    setSelected(new Set())
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {(['all', 'unassigned'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{ background: filter === f ? 'var(--ink)' : 'transparent', color: filter === f ? 'var(--paper)' : 'var(--muted)', border: '1px solid var(--border)', padding: '.35rem .8rem', fontSize: '.42rem', letterSpacing: '.2em', fontWeight: 600, cursor: 'pointer' }}>
            {f === 'all' ? 'Tous' : 'Non assignés'}
          </button>
        ))}
        {selected.size > 0 && (
          <span className="text-muted font-light" style={{ fontSize: '.72rem', marginLeft: 'auto', alignSelf: 'center' }}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Liste modèles */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid var(--border)' }}>
        {visible.map(c => {
          const assignedGroup = groups.findIndex(g => g.assignedIds.has(c.id))
          return (
            <div
              key={c.id}
              onClick={() => toggle(c.id)}
              className="flex items-center gap-3 cursor-pointer transition-colors duration-150"
              style={{ padding: '.6rem 1rem', borderBottom: '1px solid var(--border)', background: selected.has(c.id) ? 'rgba(139,0,32,.06)' : 'transparent' }}
            >
              <div style={{ width: '14px', height: '14px', border: `2px solid ${selected.has(c.id) ? 'var(--red)' : 'var(--border)'}`, background: selected.has(c.id) ? 'var(--red)' : 'transparent', flexShrink: 0 }} />
              <span className="font-light text-ink" style={{ fontSize: '.78rem' }}>{c.prenom} {c.nom}</span>
              <span className="text-muted font-light" style={{ fontSize: '.65rem', marginLeft: 'auto' }}>
                {assignedGroup >= 0 ? `→ ${groups[assignedGroup].name || `Groupe ${String.fromCharCode(65 + assignedGroup)}`}` : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Boutons assigner */}
      <div className="flex flex-col gap-2">
        {groups.map((g, i) => (
          <button
            key={i}
            type="button"
            disabled={selected.size === 0}
            onClick={() => assignSelected(i)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '.7rem 1rem', border: `1px solid hsl(${i * 60}, 60%, 40%)`,
              color: `hsl(${i * 60}, 60%, 30%)`, background: `hsla(${i * 60}, 60%, 40%, .06)`,
              fontSize: '.42rem', letterSpacing: '.2em', fontWeight: 600, cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
              opacity: selected.size === 0 ? .5 : 1,
            }}
          >
            <span>→ {g.name || `Groupe ${String.fromCharCode(65 + i)}`} · {g.call_time || '—'}</span>
            <span>{g.assignedIds.size} modèle{g.assignedIds.size !== 1 ? 's' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
