'use client'

import { useEffect, useState, useCallback, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

/* ── Types ─────────────────────────────────────────────────── */
interface Candidature {
  id: string
  prenom: string
  nom: string
  email: string
  telephone: string
  instagram?: string | null
  taille?: number | null
  genre?: string | null
  poitrine?: number | null
  tour_taille?: number | null
  hanches?: number | null
  pointure?: number | null
  taille_haut?: string | null
  taille_bas?: string | null
  experience?: string | null
  disponibilite?: string | null
  date_inscription: string
  selectionne: boolean
  photo_profil_signed?: string | null
  photo_body_signed?: string | null
}

interface Group {
  name: string
  time: string
  members: string
}

interface SessionForm {
  project:   string
  dateFr:    string
  dateEn:    string
  addressFr: string
  groups:    Group[]
  notesFr:   string
  notesEn:   string
  unpaid:    boolean
  moodboard: boolean
  whatsapp:  string
}

const defaultSession: SessionForm = {
  project: '', dateFr: '', dateEn: '', addressFr: '',
  groups: [{ name: '', time: '', members: '' }],
  notesFr: '', notesEn: '', unpaid: false, moodboard: false, whatsapp: '',
}

/* ── Composant carte candidature ────────────────────────────── */
function CandidatureCard({
  c, selected, onToggle,
}: { c: Candidature; selected: boolean; onToggle: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const date = new Date(c.date_inscription).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  const showBody = hovered && !!c.photo_body_signed
  const activeSrc = showBody ? c.photo_body_signed! : c.photo_profil_signed

  return (
    <div
      onClick={() => onToggle(c.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer transition-all duration-300"
      style={{
        border: selected ? '1px solid var(--red)' : '1px solid var(--border)',
        background: selected ? 'rgba(139,0,32,.03)' : 'var(--paper)',
        padding: '0',
        userSelect: 'none',
      }}
    >
      {/* Photo — profil par défaut, body au hover */}
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
          /* Placeholder initiales */
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic', fontWeight: 300, fontSize: '3rem',
                color: 'rgba(139,0,32,.18)',
              }}
            >
              {c.prenom[0]}{c.nom[0]}
            </span>
          </div>
        )}

        {/* Indicateur photo body disponible */}
        {c.photo_body_signed && !selected && (
          <div
            className="absolute bottom-2 right-2 font-medium uppercase"
            style={{
              fontSize: '.38rem', letterSpacing: '.18em',
              background: 'rgba(12,11,9,.45)', color: 'rgba(247,243,238,.8)',
              padding: '.2rem .45rem',
              opacity: hovered ? 0 : 1,
              transition: 'opacity .2s',
            }}
          >
            Full body
          </div>
        )}

        {/* Badge sélectionné */}
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
      </div>

      {/* Infos */}
      <div style={{ padding: '1rem 1rem .9rem' }}>
        <div
          className="text-ink font-medium mb-1 truncate"
          style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.78rem', letterSpacing: '.01em' }}
        >
          {c.prenom} {c.nom}
        </div>

        <div className="text-muted font-light truncate" style={{ fontSize: '.62rem', marginBottom: '.5rem' }}>
          {c.email}
        </div>

        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '.5rem' }}>
          {c.genre && (
            <span
              className="font-medium uppercase text-muted"
              style={{ fontSize: '.44rem', letterSpacing: '.25em', border: '1px solid var(--border)', padding: '.2rem .5rem' }}
            >
              {c.genre}
            </span>
          )}
          {c.taille && (
            <span className="text-muted font-light tabular-nums" style={{ fontSize: '.62rem' }}>
              {c.taille} cm
            </span>
          )}
        </div>

        <div className="text-muted font-light" style={{ fontSize: '.55rem', letterSpacing: '.02em' }}>
          {date}
        </div>
      </div>
    </div>
  )
}

/* ── Page principale ────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter()

  const [candidatures,    setCandidatures]    = useState<Candidature[]>([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())
  const [composerOpen,    setComposerOpen]    = useState(false)
  const [session,         setSession]         = useState<SessionForm>(defaultSession)
  const [sending,         setSending]         = useState(false)
  const [toast,           setToast]           = useState('')
  const [notifying,       setNotifying]       = useState(false)

  /* ── Vérifie le token et charge les candidatures ── */
  const fetchCandidatures = useCallback(async () => {
    const token = localStorage.getItem('lumina_token')
    if (!token) { router.replace('/admin/login'); return }

    setLoading(true)
    const res  = await fetch('/api/candidatures', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()

    if (!data.success) {
      if (res.status === 401) { localStorage.removeItem('lumina_token'); router.replace('/admin/login') }
      setLoading(false)
      return
    }

    setCandidatures(data.data)
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('lumina_token')) {
      router.replace('/admin/login')
      return
    }
    fetchCandidatures()
  }, [fetchCandidatures, router])

  function logout() {
    localStorage.removeItem('lumina_token')
    router.replace('/admin/login')
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  /* ── Envoyer notification "sélectionné" ── */
  async function handleNotify() {
    const token   = localStorage.getItem('lumina_token')!
    const models  = candidatures.filter(c => selectedIds.has(c.id))
    setNotifying(true)

    const results = await Promise.allSettled(
      models.map(c =>
        fetch('/api/select', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: c.email, prenom: c.prenom, nom: c.nom }),
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    setNotifying(false)
    showToast(`Notifications envoyées à ${sent} modèle(s).`)
  }

  /* ── Envoyer session complète ── */
  async function handleSendSession(e: FormEvent) {
    e.preventDefault()
    const token  = localStorage.getItem('lumina_token')!
    const models = candidatures
      .filter(c => selectedIds.has(c.id))
      .map(c => ({ email: c.email, prenom: c.prenom }))

    setSending(true)
    const res  = await fetch('/api/send-session', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ models, ...session }),
    })
    const data = await res.json()
    setSending(false)
    setComposerOpen(false)
    showToast(`Session envoyée à ${data.sent} modèle(s).${data.failed ? ` (${data.failed} échec)` : ''}`)
    clearSelection()
  }

  function updateSession<K extends keyof SessionForm>(key: K, val: SessionForm[K]) {
    setSession(prev => ({ ...prev, [key]: val }))
  }

  function updateGroup(i: number, field: keyof Group, val: string) {
    setSession(prev => {
      const groups = [...prev.groups]
      groups[i] = { ...groups[i], [field]: val }
      return { ...prev, groups }
    })
  }

  function addGroup() {
    setSession(prev => ({ ...prev, groups: [...prev.groups, { name: '', time: '', members: '' }] }))
  }

  function removeGroup(i: number) {
    setSession(prev => ({ ...prev, groups: prev.groups.filter((_, idx) => idx !== i) }))
  }

  /* ── Filtrage par recherche ── */
  const filtered = candidatures.filter(c => {
    const q = search.toLowerCase()
    return !q
      || c.prenom.toLowerCase().includes(q)
      || c.nom.toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
  })

  const selectedCount = selectedIds.size

  /* ── Input style helper ── */
  const inputStyle: React.CSSProperties = {
    fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.85rem',
    background: 'transparent', color: 'var(--ink)', outline: 'none', width: '100%',
    borderBottom: '1px solid var(--border)', paddingBottom: '.6rem', marginBottom: '1.5rem',
  }

  return (
    <div
      className="min-h-dvh bg-paper"
      style={{ fontFamily: "'Montserrat', sans-serif", cursor: 'default' }}
    >
      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between bg-paper"
        style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 2rem' }}
      >
        <div className="flex items-center gap-8">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Lumina<span style={{ color: 'var(--red)' }}>.</span>
          </span>
          <span className="hidden md:block font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.3em' }}>
            Dashboard Admin
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <div className="text-ink font-light tabular-nums" style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                {candidatures.length}
              </div>
              <div className="text-muted font-medium uppercase" style={{ fontSize: '.4rem', letterSpacing: '.25em' }}>
                Modèles
              </div>
            </div>
            <div style={{ width: '1px', height: '2rem', background: 'var(--border)' }} />
            <div className="text-center">
              <div className="text-red font-light tabular-nums" style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
                {candidatures.filter(c => c.selectionne).length}
              </div>
              <div className="text-muted font-medium uppercase" style={{ fontSize: '.4rem', letterSpacing: '.25em' }}>
                Sélectionnés
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="font-medium uppercase text-muted transition-colors duration-200 hover:text-red"
            style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* ── SEARCH ── */}
      <div style={{ padding: '2rem 2rem 0', maxWidth: '42rem' }}>
        <input
          type="search"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="w-full bg-transparent text-ink font-light outline-none"
          style={{
            fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.9rem',
            borderBottom: '1px solid var(--border)', paddingBottom: '.75rem',
            transition: 'border-color .2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* ── GRILLE CANDIDATURES ── */}
      <div style={{ padding: '2rem 2rem 8rem' }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="font-light text-muted"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem' }}
            >
              Chargement…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: 'rgba(139,0,32,.15)', marginBottom: '1rem' }}>
                Aucun résultat
              </div>
              <div className="text-muted font-light" style={{ fontSize: '.7rem' }}>
                {search ? `Aucun modèle ne correspond à "${search}"` : 'Aucune candidature enregistrée.'}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}
          >
            {filtered.map(c => (
              <CandidatureCard
                key={c.id}
                c={c}
                selected={selectedIds.has(c.id)}
                onToggle={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── BARRE DE SÉLECTION FLOTTANTE ── */}
      {selectedCount > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between"
          style={{
            background: 'var(--ink)', color: 'var(--paper)',
            padding: '1.2rem 2rem',
            boxShadow: '0 -4px 32px rgba(0,0,0,.18)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={clearSelection}
              className="flex items-center justify-center transition-opacity duration-200 hover:opacity-60"
              style={{ width: '1.6rem', height: '1.6rem', border: '1px solid rgba(247,243,238,.2)', background: 'none' }}
              aria-label="Effacer la sélection"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <span
              className="font-medium"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.1rem' }}
            >
              {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNotify}
              disabled={notifying}
              className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
              style={{
                fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em',
                color: 'var(--paper)', background: 'none',
                border: '1px solid rgba(247,243,238,.3)', padding: '.65rem 1.2rem',
                opacity: notifying ? .5 : 1, cursor: notifying ? 'not-allowed' : 'pointer',
              }}
            >
              {notifying ? 'Envoi…' : 'Notifier la sélection'}
            </button>
            <button
              onClick={() => { setComposerOpen(true); setSession(defaultSession) }}
              className="font-medium uppercase"
              style={{
                fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em',
                background: 'var(--red)', color: 'var(--paper)', padding: '.65rem 1.2rem',
              }}
            >
              Composer session
            </button>
          </div>
        </div>
      )}

      {/* ── COMPOSER MODAL ── */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
          style={{ background: 'rgba(12,11,9,.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setComposerOpen(false) }}
        >
          <div
            className="w-full md:max-w-xl overflow-y-auto bg-paper"
            style={{
              maxHeight: '90dvh',
              borderRadius: '1rem 1rem 0 0',
              padding: '2rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.5rem', color: 'var(--ink)' }}>
                  Composer une session
                </div>
                <div className="text-muted font-medium uppercase mt-1" style={{ fontSize: '.44rem', letterSpacing: '.25em' }}>
                  {selectedCount} modèle{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => setComposerOpen(false)}
                className="text-muted transition-colors duration-200 hover:text-red"
                style={{ background: 'none', fontSize: '1.2rem', lineHeight: 1 }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendSession}>

              {/* Nom du projet */}
              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                Nom du projet *
              </label>
              <input
                required value={session.project}
                onChange={e => updateSession('project', e.target.value)}
                placeholder="Ex: Campagne Printemps 2026"
                style={inputStyle}
              />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                    Date (FR) *
                  </label>
                  <input
                    required value={session.dateFr}
                    onChange={e => updateSession('dateFr', e.target.value)}
                    placeholder="jeudi 12 juin 2026"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                    Date (EN)
                  </label>
                  <input
                    value={session.dateEn}
                    onChange={e => updateSession('dateEn', e.target.value)}
                    placeholder="Thursday, June 12, 2026"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Adresse */}
              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                Adresse *
              </label>
              <input
                required value={session.addressFr}
                onChange={e => updateSession('addressFr', e.target.value)}
                placeholder="123 rue Sainte-Catherine, Montréal"
                style={inputStyle}
              />

              {/* Groupes (call times) */}
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                  Groupes (call times)
                </label>
                <button
                  type="button" onClick={addGroup}
                  className="font-medium uppercase text-red transition-opacity duration-200 hover:opacity-70"
                  style={{ background: 'none', fontSize: '.44rem', letterSpacing: '.25em' }}
                >
                  + Ajouter
                </button>
              </div>

              {session.groups.map((g, i) => (
                <div key={i} className="grid gap-2 mb-3" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end' }}>
                  <input
                    value={g.name}
                    onChange={e => updateGroup(i, 'name', e.target.value)}
                    placeholder="Groupe A"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                  <input
                    value={g.time}
                    onChange={e => updateGroup(i, 'time', e.target.value)}
                    placeholder="10h00"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                  <input
                    value={g.members}
                    onChange={e => updateGroup(i, 'members', e.target.value)}
                    placeholder="Membres"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                  {session.groups.length > 1 && (
                    <button
                      type="button" onClick={() => removeGroup(i)}
                      className="text-muted transition-colors duration-200 hover:text-red"
                      style={{ background: 'none', paddingBottom: '.6rem', fontSize: '.9rem' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div style={{ height: '1rem' }} />

              {/* Notes */}
              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                Notes (FR)
              </label>
              <textarea
                value={session.notesFr}
                onChange={e => updateSession('notesFr', e.target.value)}
                rows={2}
                placeholder="Instructions supplémentaires en français…"
                style={{ ...inputStyle, resize: 'none' }}
              />

              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                Notes (EN)
              </label>
              <textarea
                value={session.notesEn}
                onChange={e => updateSession('notesEn', e.target.value)}
                rows={2}
                placeholder="Additional instructions in English…"
                style={{ ...inputStyle, resize: 'none' }}
              />

              {/* WhatsApp */}
              <label className="block font-medium uppercase text-muted mb-2" style={{ fontSize: '.44rem', letterSpacing: '.28em' }}>
                Lien WhatsApp
              </label>
              <input
                type="url" value={session.whatsapp}
                onChange={e => updateSession('whatsapp', e.target.value)}
                placeholder="https://chat.whatsapp.com/…"
                style={inputStyle}
              />

              {/* Options */}
              <div className="flex gap-6 mb-8">
                {([
                  ['unpaid',    'Participation non rémunérée'],
                  ['moodboard', 'Moodboard joint'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={session[key] as boolean}
                      onChange={e => updateSession(key, e.target.checked)}
                      className="accent-red w-3 h-3"
                    />
                    <span className="font-light text-ink" style={{ fontSize: '.72rem' }}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Envoi */}
              <button
                type="submit"
                disabled={sending}
                className="w-full font-medium uppercase text-paper transition-opacity duration-200"
                style={{
                  fontFamily: "'Montserrat', sans-serif", fontSize: '.58rem', letterSpacing: '.3em',
                  background: 'var(--red)', padding: '1rem',
                  opacity: sending ? .6 : 1, cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Envoi en cours…' : `Envoyer à ${selectedCount} modèle${selectedCount > 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 z-[200] font-medium"
          style={{
            transform: 'translateX(-50%)',
            fontFamily: "'Montserrat', sans-serif", fontSize: '.62rem', letterSpacing: '.08em',
            background: 'var(--ink)', color: 'var(--paper)',
            padding: '.75rem 1.5rem',
            boxShadow: '0 4px 24px rgba(0,0,0,.18)',
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
