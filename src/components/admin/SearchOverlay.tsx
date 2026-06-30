'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface CandidatureResult {
  id:               string
  prenom:           string
  nom:              string
  email:            string
  ville:            string | null
  genre:            string | null
  photo_profil_url: string | null
}

interface SessionResult {
  id:      string
  project: string
  type:    string
  date:    string
}

interface Props {
  open:             boolean
  onClose:          () => void
  onSelectCandidat: (id: string) => void
}

const TYPE_LABEL: Record<string, string> = { photo: 'Photo', video: 'Vidéo', hybrid: 'Photo & Vidéo' }

export function SearchOverlay({ open, onClose, onSelectCandidat }: Props) {
  const router                      = useRouter()
  const inputRef                    = useRef<HTMLInputElement>(null)
  const [q, setQ]                   = useState('')
  const [candidatures, setCandidatures] = useState<CandidatureResult[]>([])
  const [sessions, setSessions]     = useState<SessionResult[]>([])
  const [loading, setLoading]       = useState(false)
  const [activeIdx, setActiveIdx]   = useState(0)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allResults = [
    ...candidatures.map(c => ({ type: 'candidat' as const, id: c.id, label: `${c.prenom} ${c.nom}`, sub: [c.ville, c.genre].filter(Boolean).join(' · ') })),
    ...sessions.map(s => ({ type: 'session' as const, id: s.id, label: s.project, sub: `${new Date(s.date + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })} · ${TYPE_LABEL[s.type] ?? s.type}` })),
  ]

  // Reset et focus à l'ouverture
  useEffect(() => {
    if (open) {
      setQ(''); setCandidatures([]); setSessions([]); setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  // Debounce 300ms sur la saisie
  const search = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.length < 2) { setCandidatures([]); setSessions([]); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
      const data = await res.json()
      setCandidatures(data.candidatures ?? [])
      setSessions(data.sessions ?? [])
      setActiveIdx(0)
      setLoading(false)
    }, 300)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value)
    search(e.target.value)
  }

  function selectResult(r: typeof allResults[number]) {
    if (r.type === 'candidat') {
      onSelectCandidat(r.id)
      onClose()
    } else {
      router.push('/admin/sessions')
      onClose()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && allResults[activeIdx]) selectResult(allResults[activeIdx])
  }

  if (!open) return null

  const hasCandidats = candidatures.length > 0
  const hasSessions  = sessions.length > 0
  const hasResults   = hasCandidats || hasSessions
  const showEmpty    = q.length >= 2 && !loading && !hasResults

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', background: 'rgba(10,8,5,.55)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ width: '100%', maxWidth: '560px', margin: '0 1rem', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.18)', borderRadius: '4px', overflow: 'hidden' }}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, color: 'var(--muted)' }}>
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={handleChange}
            placeholder="Rechercher un modèle, une session…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '.9rem', color: 'var(--ink)', background: 'transparent', fontFamily: 'inherit' }}
          />
          {loading && (
            <div style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: '#8B0020', borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0 }} />
          )}
          <kbd style={{ fontSize: '.5rem', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.15rem .4rem', borderRadius: '3px', fontFamily: 'inherit', letterSpacing: '.05em', flexShrink: 0 }}>Esc</kbd>
        </div>

        {/* Résultats */}
        {hasResults && (
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {hasCandidats && (
              <div>
                <div style={{ padding: '.5rem 1.1rem .25rem', fontSize: '.42rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Modèles</div>
                {candidatures.map(c => {
                  const idx = allResults.findIndex(r => r.id === c.id && r.type === 'candidat')
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectResult(allResults[idx])}
                      onMouseEnter={() => setActiveIdx(idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: '.75rem', width: '100%', padding: '.6rem 1.1rem', border: 'none', background: activeIdx === idx ? 'rgba(139,0,32,.05)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .1s', borderLeft: activeIdx === idx ? '2px solid #8B0020' : '2px solid transparent' }}
                    >
                      <div style={{ width: '28px', height: '36px', background: 'rgba(0,0,0,.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {c.prenom[0]}{c.nom[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink)' }}>{c.prenom} {c.nom}</div>
                        <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: '.1rem' }}>{[c.ville, c.genre].filter(Boolean).join(' · ') || c.email}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {hasSessions && (
              <div style={{ borderTop: hasCandidats ? '1px solid var(--border)' : 'none' }}>
                <div style={{ padding: '.5rem 1.1rem .25rem', fontSize: '.42rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Sessions</div>
                {sessions.map(s => {
                  const idx = allResults.findIndex(r => r.id === s.id && r.type === 'session')
                  const dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectResult(allResults[idx])}
                      onMouseEnter={() => setActiveIdx(idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: '.75rem', width: '100%', padding: '.6rem 1.1rem', border: 'none', background: activeIdx === idx ? 'rgba(139,0,32,.05)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .1s', borderLeft: activeIdx === idx ? '2px solid #8B0020' : '2px solid transparent' }}
                    >
                      <div style={{ width: '28px', height: '36px', background: 'rgba(139,0,32,.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>📅</div>
                      <div>
                        <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink)' }}>{s.project}</div>
                        <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: '.1rem' }}>{dateLabel} · {TYPE_LABEL[s.type] ?? s.type}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {showEmpty && (
          <div style={{ padding: '1.5rem 1.1rem', textAlign: 'center', fontSize: '.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            Aucun résultat pour « {q} »
          </div>
        )}

        {/* Footer hint */}
        <div style={{ padding: '.45rem 1.1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.48rem', color: 'var(--muted)', letterSpacing: '.06em' }}><kbd style={{ fontFamily: 'inherit' }}>↑↓</kbd> naviguer</span>
          <span style={{ fontSize: '.48rem', color: 'var(--muted)', letterSpacing: '.06em' }}><kbd style={{ fontFamily: 'inherit' }}>↵</kbd> sélectionner</span>
          <span style={{ fontSize: '.48rem', color: 'var(--muted)', letterSpacing: '.06em' }}><kbd style={{ fontFamily: 'inherit' }}>Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}
