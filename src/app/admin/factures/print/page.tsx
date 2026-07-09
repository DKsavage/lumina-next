'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { InvoiceRow, ModelGroup, SessionGroupRow } from '@/lib/factures'

export default function FacturesPrintPage() {
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/factures?${searchParams.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const groups = d.data as (ModelGroup | SessionGroupRow)[]
        setRows(groups.flatMap(g => g.invoices))
      })
      .finally(() => setLoading(false))
  }, [searchParams])

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>Chargement…</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Arial, sans-serif', color: '#0a0a0a' }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print" style={{ marginBottom: '16px' }}>
        <button onClick={() => window.print()} style={{ background: '#8B0020', color: '#fff', border: 'none', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          Imprimer / Télécharger PDF
        </button>
      </div>

      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>Factures — {rows.length} résultat{rows.length > 1 ? 's' : ''}</h1>

      <table width="100%" cellPadding={0} cellSpacing={0}>
        <thead>
          <tr style={{ background: '#0a0a0a' }}>
            {['Numéro', 'Statut', 'Modèle', 'Projet', 'Date', 'Montant', 'Rôle'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#fff' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.invoice_number ?? '—'}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.invoice_status}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.model_prenom} {r.model_nom ?? ''}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.project}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.date}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.payment_amount?.toFixed(2) ?? '0.00'} $</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
