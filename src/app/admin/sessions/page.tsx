'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionStatusPanel } from '@/components/admin/SessionStatusPanel'

interface SessionRow {
  id:         string
  project:    string
  type:       string
  date:       string
  status:     string
  created_at: string
  max_models: number | null
  stats:      { confirmed: number; cancelled: number; pending: number; total: number }
}

const TYPE_LABEL: Record<string, string> = {
  photo:  'Photo',
  video:  'Vidéo',
  hybrid: 'Photo & Vidéo',
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [statusId, setStatusId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.replace('/admin/login'); return }
        setSessions(d.data)
      })
      .finally(() => setLoading(false))
  }, [router])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-dvh bg-paper" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-paper" style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 2rem' }}>
        <div className="flex items-center gap-8">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Lumina<span style={{ color: 'var(--red)' }}>.</span>
          </span>
          <span className="hidden md:block font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.3em' }}>Historique Sessions</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/admin/dashboard')} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>← Dashboard</button>
          <button onClick={logout} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-red" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>Déconnexion</button>
        </div>
      </nav>

      <div style={{ padding: '2rem' }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="font-light text-muted" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem' }}>Chargement…</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: 'rgba(139,0,32,.15)' }}>Aucune session</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {sessions.map(s => {
              const isPast = new Date(s.date + 'T23:59:59') < new Date()
              const pct    = s.stats.total ? Math.round((s.stats.confirmed / s.stats.total) * 100) : 0
              const dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString('fr-CA', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusId(s.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '1.1rem 1.4rem',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,0,32,.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Projet + type */}
                  <div>
                    <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '.2rem' }}>{s.project}</div>
                    <div style={{ fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '.1em' }}>{TYPE_LABEL[s.type] ?? s.type} · {dateLabel}</div>
                  </div>

                  {/* Barre de progression confirmés */}
                  <div style={{ width: '8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                      <span style={{ fontSize: '.62rem', color: 'var(--ink)', fontWeight: 600 }}>{s.stats.confirmed}/{s.stats.total}</span>
                      <span style={{ fontSize: '.58rem', color: 'var(--muted)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(20,120,60,.7)', transition: 'width .4s ease' }} />
                    </div>
                    {s.stats.cancelled > 0 && (
                      <div style={{ fontSize: '.55rem', color: 'var(--muted)', marginTop: '.25rem' }}>{s.stats.cancelled} annulé{s.stats.cancelled > 1 ? 's' : ''} · {s.stats.pending} en attente</div>
                    )}
                  </div>

                  {/* Badge capacité — rouge si atteinte */}
                  {s.max_models !== null && (() => {
                    const atCapacity = s.stats.total >= s.max_models
                    return (
                      <div style={{
                        fontSize: '.55rem', fontWeight: 600, letterSpacing: '.12em',
                        padding: '.25rem .6rem',
                        background: atCapacity ? 'rgba(139,0,32,.08)' : 'transparent',
                        color:      atCapacity ? '#8B0020' : 'var(--muted)',
                        border:     `1px solid ${atCapacity ? 'rgba(139,0,32,.3)' : 'var(--border)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {s.stats.total}/{s.max_models}
                      </div>
                    )
                  })()}

                  {/* Badge passé / à venir */}
                  <div style={{
                    fontSize: '.55rem', fontWeight: 600, letterSpacing: '.12em',
                    padding: '.25rem .6rem',
                    background: isPast ? 'rgba(0,0,0,.05)' : 'rgba(20,120,60,.08)',
                    color:      isPast ? 'var(--muted)' : 'rgba(20,120,60,.85)',
                    border:     `1px solid ${isPast ? 'var(--border)' : 'rgba(20,120,60,.2)'}`,
                  }}>
                    {isPast ? 'PASSÉ' : 'À VENIR'}
                  </div>

                  {/* Flèche */}
                  <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {statusId && (
        <SessionStatusPanel
          sessionId={statusId}
          onClose={() => setStatusId(null)}
          onDeleted={() => {
            setStatusId(null)
            fetch('/api/sessions')
              .then(r => r.json())
              .then(d => { if (d.success) setSessions(d.data) })
          }}
        />
      )}
    </div>
  )
}
