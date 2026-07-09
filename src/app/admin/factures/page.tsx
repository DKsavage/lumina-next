'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InvoiceStatus, ModelGroup, SessionGroupRow } from '@/lib/factures'
import { buildInvoiceCsv } from '@/lib/factures'

const STATUS_LABEL: Record<InvoiceStatus, string> = { pending: 'En attente', sent: 'Envoyée', paid: 'Payée' }
const STATUS_CYCLE: InvoiceStatus[] = ['pending', 'sent', 'paid']
const STATUS_COLOR: Record<InvoiceStatus, string> = {
  pending: 'var(--muted)',
  sent:    '#2563eb',
  paid:    'rgba(20,120,60,.85)',
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FacturesPage() {
  const router = useRouter()
  const [groupBy,  setGroupBy]  = useState<'session' | 'model'>('session')
  const [status,   setStatus]   = useState<InvoiceStatus | ''>('')
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')
  const [q,        setQ]        = useState('')
  const [rows,     setRows]     = useState<(ModelGroup | SessionGroupRow)[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function fetchData() {
    setLoading(true)
    const params = new URLSearchParams({ groupBy })
    if (status) params.set('status', status)
    if (from)   params.set('from', from)
    if (to)     params.set('to', to)
    if (q)      params.set('q', q)

    fetch(`/api/factures?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.replace('/admin/login'); return }
        setRows(d.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(fetchData, [groupBy, status, from, to, q])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  async function cycleStatus(id: string, current: InvoiceStatus) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
    await fetch(`/api/factures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_status: next }),
    })
    fetchData()
  }

  async function resend(id: string) {
    await fetch(`/api/factures/${id}/resend`, { method: 'POST' })
  }

  function toggle(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function handleExportCSV() {
    const allInvoices = rows.flatMap(r => r.invoices)
    const csv  = buildInvoiceCsv(allInvoices)
    const blob = new Blob([new TextEncoder().encode('﻿' + csv)], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `factures-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Montserrat', sans-serif", fontWeight: 300, fontSize: '.6rem',
    background: 'transparent', border: '1px solid var(--border)', outline: 'none',
    padding: '.35rem .6rem', color: 'var(--ink)',
  }
  const btnToggle: React.CSSProperties = {
    fontSize: '.42rem', letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase',
    padding: '.3rem .8rem', cursor: 'pointer', border: '1px solid var(--border)', background: 'none',
  }

  return (
    <div className="min-h-dvh bg-paper" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-paper" style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 2rem' }}>
        <div className="flex items-center gap-8">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>F</span>
          <span className="hidden md:block font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.3em' }}>Factures</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/admin/dashboard')} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>← Dashboard</button>
          <button onClick={logout} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-red" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>Déconnexion</button>
        </div>
      </nav>

      <div style={{ padding: '2rem' }}>
        {/* Barre d'actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.6rem', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
            <button onClick={() => setGroupBy('session')} style={{ ...btnToggle, borderRight: '1px solid var(--border)', color: groupBy === 'session' ? 'var(--ink)' : 'var(--muted)', background: groupBy === 'session' ? 'rgba(0,0,0,.04)' : 'none' }}>Par session</button>
            <button onClick={() => setGroupBy('model')} style={{ ...btnToggle, color: groupBy === 'model' ? 'var(--ink)' : 'var(--muted)', background: groupBy === 'model' ? 'rgba(0,0,0,.04)' : 'none' }}>Par modèle</button>
          </div>

          <select value={status} onChange={e => setStatus(e.target.value as InvoiceStatus | '')} style={inputStyle}>
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
          </select>

          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} aria-label="Date de début" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} aria-label="Date de fin" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher modèle ou projet…" style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />

          <button onClick={handleExportCSV} style={btnToggle}>Exporter CSV</button>
          <button onClick={() => window.open(`/admin/factures/print?${new URLSearchParams({ groupBy, status, from, to, q }).toString()}`, '_blank')} style={btnToggle}>Vue imprimable</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="font-light text-muted" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem' }}>Chargement…</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: 'rgba(139,0,32,.15)' }}>Aucune facture</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {rows.map(group => {
              const key = 'session_id' in group ? group.session_id : group.model_email
              const isOpen = expanded.has(key)
              const title = 'session_id' in group ? group.project : group.model_name
              const subtitle = 'session_id' in group ? fmtDate(group.date) : `${group.invoices.length} facture${group.invoices.length > 1 ? 's' : ''} · ${group.total_paid.toFixed(2)} $ payé`

              return (
                <div key={key} style={{ border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '1rem 1.2rem', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{subtitle}</div>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{isOpen ? '︿' : '﹀'}</span>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {group.invoices.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.7rem 1.2rem', borderBottom: '1px solid var(--border)', gap: '.8rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '.7rem', color: 'var(--ink)', fontWeight: 600 }}>
                              {'session_id' in group ? `${inv.model_prenom} ${inv.model_nom ?? ''}` : inv.project}
                            </div>
                            <div style={{ fontSize: '.58rem', color: 'var(--muted)' }}>
                              {inv.invoice_number ?? 'Non numérotée'} · {inv.role} · {inv.payment_amount?.toFixed(2) ?? '0.00'} $
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => cycleStatus(inv.id, inv.invoice_status)}
                            style={{ fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 600, textTransform: 'uppercase', color: STATUS_COLOR[inv.invoice_status], background: 'none', border: `1px solid ${STATUS_COLOR[inv.invoice_status]}`, padding: '.25rem .6rem', cursor: 'pointer', flexShrink: 0 }}
                          >
                            {STATUS_LABEL[inv.invoice_status]}
                          </button>
                          <a href={`/facture/${inv.token}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.62rem', color: 'var(--muted)', textDecoration: 'none' }}>↗ Voir</a>
                          <button type="button" onClick={() => resend(inv.id)} style={{ fontSize: '.58rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }} title="Renvoyer l'email">✉</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
