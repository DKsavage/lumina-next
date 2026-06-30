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

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// Retourne les jours du mois sous forme de grille 6×7 (lundi en premier)
function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const first     = new Date(year, month, 1)
  const last      = new Date(year, month + 1, 0)
  // getDay() : 0=dim, 1=lun … → décalage lundi=0
  const startOffset = (first.getDay() + 6) % 7
  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [statusId, setStatusId] = useState<string | null>(null)
  const [view,     setView]     = useState<'list' | 'calendar'>('list')

  const today = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

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

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // Index sessions par date ISO pour le calendrier
  const byDate = sessions.reduce<Record<string, SessionRow[]>>((acc, s) => {
    acc[s.date] = [...(acc[s.date] ?? []), s]
    return acc
  }, {})

  const grid = buildCalendarGrid(calYear, calMonth)
  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })

  const btnToggle: React.CSSProperties = {
    fontSize: '.42rem', letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase',
    padding: '.3rem .8rem', cursor: 'pointer', border: '1px solid var(--border)', background: 'none',
  }

  return (
    <div className="min-h-dvh bg-paper" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-paper" style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 2rem' }}>
        <div className="flex items-center gap-8">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Flawa Models
          </span>
          <span className="hidden md:block font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.3em' }}>Historique Sessions</span>
        </div>
        <div className="flex items-center gap-6">
          {/* Toggle vue */}
          <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setView('list')}
              style={{ ...btnToggle, borderRight: '1px solid var(--border)', color: view === 'list' ? 'var(--ink)' : 'var(--muted)', background: view === 'list' ? 'rgba(0,0,0,.04)' : 'none' }}
            >
              ≡ Liste
            </button>
            <button
              onClick={() => setView('calendar')}
              style={{ ...btnToggle, color: view === 'calendar' ? 'var(--ink)' : 'var(--muted)', background: view === 'calendar' ? 'rgba(0,0,0,.04)' : 'none' }}
            >
              ⊞ Calendrier
            </button>
          </div>
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

        ) : view === 'list' ? (
          /* ── VUE LISTE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {sessions.map(s => {
              const isPast    = new Date(s.date + 'T23:59:59') < new Date()
              const pct       = s.stats.total ? Math.round((s.stats.confirmed / s.stats.total) * 100) : 0
              const atCap     = s.max_models !== null && s.stats.total >= s.max_models
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
                  <div>
                    <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '.2rem' }}>{s.project}</div>
                    <div style={{ fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '.1em' }}>{TYPE_LABEL[s.type] ?? s.type} · {dateLabel}</div>
                  </div>

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

                  {s.max_models !== null && (
                    <div style={{ fontSize: '.55rem', fontWeight: 600, letterSpacing: '.12em', padding: '.25rem .6rem', background: atCap ? 'rgba(139,0,32,.08)' : 'transparent', color: atCap ? '#8B0020' : 'var(--muted)', border: `1px solid ${atCap ? 'rgba(139,0,32,.3)' : 'var(--border)'}`, whiteSpace: 'nowrap' }}>
                      {s.stats.total}/{s.max_models}
                    </div>
                  )}

                  <div style={{ fontSize: '.55rem', fontWeight: 600, letterSpacing: '.12em', padding: '.25rem .6rem', background: isPast ? 'rgba(0,0,0,.05)' : 'rgba(20,120,60,.08)', color: isPast ? 'var(--muted)' : 'rgba(20,120,60,.85)', border: `1px solid ${isPast ? 'var(--border)' : 'rgba(20,120,60,.2)'}` }}>
                    {isPast ? 'PASSÉ' : 'À VENIR'}
                  </div>

                  <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>›</span>
                </button>
              )
            })}
          </div>

        ) : (
          /* ── VUE CALENDRIER ── */
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>

            {/* En-tête mois + navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--border)', padding: '.4rem .9rem', cursor: 'pointer', fontSize: '.9rem', color: 'var(--muted)' }}>‹</button>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.5rem', color: 'var(--ink)', textTransform: 'capitalize' }}>
                {monthLabel}
              </div>
              <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--border)', padding: '.4rem .9rem', cursor: 'pointer', fontSize: '.9rem', color: 'var(--muted)' }}>›</button>
            </div>

            {/* Noms des jours */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
              {DAYS_FR.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '.42rem', fontWeight: 600, letterSpacing: '.2em', color: 'var(--muted)', padding: '.4rem 0', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grille jours */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {grid.map((day, i) => {
                if (!day) return <div key={i} style={{ minHeight: '80px', background: 'rgba(0,0,0,.02)' }} />

                const iso       = day.toISOString().slice(0, 10)
                const daySessions = byDate[iso] ?? []
                const isToday   = iso === today.toISOString().slice(0, 10)
                const isPast    = day < today && !isToday

                return (
                  <div
                    key={iso}
                    style={{
                      minHeight: '80px',
                      border: '1px solid var(--border)',
                      padding: '.4rem',
                      background: isToday ? 'rgba(139,0,32,.04)' : 'transparent',
                    }}
                  >
                    {/* Numéro du jour */}
                    <div style={{
                      fontSize: '.65rem', fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#8B0020' : isPast ? 'var(--muted)' : 'var(--ink)',
                      marginBottom: '.3rem',
                    }}>
                      {day.getDate()}
                    </div>

                    {/* Sessions ce jour */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {daySessions.map(s => {
                        const atCap = s.max_models !== null && s.stats.total >= s.max_models
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setStatusId(s.id)}
                            title={`${s.project} · ${s.stats.confirmed}/${s.stats.total} confirmés`}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '2px 4px',
                              background: atCap ? 'rgba(139,0,32,.12)' : 'rgba(20,120,60,.1)',
                              border: `1px solid ${atCap ? 'rgba(139,0,32,.3)' : 'rgba(20,120,60,.25)'}`,
                              borderLeft: `3px solid ${atCap ? '#8B0020' : 'rgba(20,120,60,.7)'}`,
                              cursor: 'pointer',
                              overflow: 'hidden',
                            }}
                          >
                            <div style={{ fontSize: '.55rem', fontWeight: 600, color: atCap ? '#8B0020' : 'rgba(20,120,60,.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.project}
                            </div>
                            <div style={{ fontSize: '.48rem', color: 'var(--muted)' }}>
                              {s.stats.confirmed}/{s.stats.total}{s.max_models !== null ? `/${s.max_models}` : ''}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Légende */}
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <div style={{ width: '12px', height: '8px', background: 'rgba(20,120,60,.1)', borderLeft: '3px solid rgba(20,120,60,.7)' }} />
                <span style={{ fontSize: '.5rem', color: 'var(--muted)', letterSpacing: '.12em' }}>En cours</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <div style={{ width: '12px', height: '8px', background: 'rgba(139,0,32,.12)', borderLeft: '3px solid #8B0020' }} />
                <span style={{ fontSize: '.5rem', color: 'var(--muted)', letterSpacing: '.12em' }}>Capacité atteinte</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <div style={{ width: '12px', height: '8px', background: 'rgba(139,0,32,.04)', border: '1px solid rgba(139,0,32,.2)' }} />
                <span style={{ fontSize: '.5rem', color: 'var(--muted)', letterSpacing: '.12em' }}>Aujourd'hui</span>
              </div>
            </div>
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
