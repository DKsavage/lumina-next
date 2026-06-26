'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface InvoiceData {
  token:          string
  role:           string
  model_prenom:   string
  model_nom:      string | null
  model_email:    string
  payment_amount: number | null
  session: {
    project:           string
    date:              string
    compensation_json: { type: string; amount: string | null; payment_method: string | null } | null
  } | null
}

function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function FacturePage() {
  const { token } = useParams<{ token: string }>()
  const [data,    setData]    = useState<InvoiceData | null>(null)
  const [error,   setError]   = useState('')
  const [adresse, setAdresse] = useState('')

  useEffect(() => {
    fetch(`/api/facture/${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.message ?? 'Lien invalide.'); return }
        setData(d.data)
      })
      .catch(() => setError('Erreur réseau.'))
  }, [token])

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', color: '#8B0020' }}>
      {error}
    </div>
  )
  if (!data) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', color: '#6b6b6b' }}>
      Chargement…
    </div>
  )

  const fullName   = [data.model_prenom, data.model_nom].filter(Boolean).join(' ')
  const invoiceNum = `LUM-${new Date().getFullYear()}-${token.slice(0, 6).toUpperCase()}`
  const today      = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
  const deadline   = addDays(new Date().toISOString().slice(0, 10), 30)
  const amount     = data.payment_amount
    ?? (data.session?.compensation_json?.amount ? parseFloat(data.session.compensation_json.amount) : null)
    ?? 0
  const sessionDate = data.session
    ? new Date(data.session.date + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const inputStyle: React.CSSProperties = {
    border: 'none', borderBottom: '1px solid #aaa', outline: 'none',
    fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#0a0a0a',
    background: 'transparent', width: '100%', padding: '2px 0',
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .invoice-wrapper { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div style={{ background: '#f5f5f5', minHeight: '100dvh', padding: '32px 16px', fontFamily: 'Arial, sans-serif' }}>

        {/* Bouton imprimer */}
        <div className="no-print" style={{ maxWidth: '680px', margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#8B0020', color: '#fff', border: 'none', padding: '10px 24px', fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', cursor: 'pointer' }}
          >
            Imprimer / Télécharger PDF
          </button>
        </div>

        <div className="invoice-wrapper" style={{ maxWidth: '680px', margin: '0 auto', background: '#fff', padding: '48px 56px', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>

          {/* En-tête */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0a0a0a', marginBottom: '6px' }}>{fullName}</div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '4px' }}>Adresse :</div>
              <input
                className="no-print"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                placeholder="Votre adresse complète"
                style={{ ...inputStyle, width: '240px' }}
              />
              <div className="print-only" style={{ display: 'none', fontSize: '13px', color: '#0a0a0a' }}>{adresse}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8B0020', marginBottom: '12px' }}>
                Facture
              </div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '2px' }}>Numéro Facture</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a0a0a', marginBottom: '10px' }}>{invoiceNum}</div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '2px' }}>Émission</div>
              <div style={{ fontSize: '13px', color: '#0a0a0a', marginBottom: '10px' }}>{today}</div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '2px' }}>Paiement avant le</div>
              <div style={{ fontSize: '13px', color: '#0a0a0a', marginBottom: '10px' }}>{deadline}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#8B0020' }}>Solde dû : {fmt(amount)} $</div>
            </div>
          </div>

          {/* Séparateur */}
          <hr style={{ border: 'none', borderTop: '2px solid #8B0020', margin: '0 0 28px' }} />

          {/* Facturé à */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '.18em', textTransform: 'uppercase', color: '#6b6b6b', fontWeight: 700, marginBottom: '8px' }}>
              Facturé à
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0a0a0a', lineHeight: 1.6 }}>Photographie Lumina Inc.</div>
            <div style={{ fontSize: '13px', color: '#0a0a0a', lineHeight: 1.6 }}>Rep. M. Jonas Friard</div>
            <div style={{ fontSize: '13px', color: '#0a0a0a', lineHeight: 1.6 }}>2165 Avenue Charlemagne</div>
            <div style={{ fontSize: '13px', color: '#0a0a0a', lineHeight: 1.6 }}>Montréal, H1W 0A7, QC</div>
            <div style={{ fontSize: '13px', color: '#0a0a0a', lineHeight: 1.6 }}>luminaphotography.mtl@gmail.com</div>
          </div>

          {/* Tableau articles */}
          <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#0a0a0a' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left',  fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#fff', fontWeight: 600 }}>Articles et description</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#fff', fontWeight: 600 }}>Tarif</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#fff', fontWeight: 600 }}>Qté</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#fff', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '14px', fontSize: '13px', color: '#0a0a0a', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600 }}>{data.role}</div>
                  {data.session && (
                    <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '3px' }}>
                      Projet : {data.session.project}{sessionDate ? ` · ${sessionDate}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px', textAlign: 'right', fontSize: '13px', color: '#0a0a0a' }}>{fmt(amount)} $</td>
                <td style={{ padding: '14px', textAlign: 'right', fontSize: '13px', color: '#0a0a0a' }}>1</td>
                <td style={{ padding: '14px', textAlign: 'right', fontSize: '13px', color: '#0a0a0a', fontWeight: 600 }}>{fmt(amount)} $</td>
              </tr>
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#8B0020' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '.08em', textTransform: 'uppercase' }}>Montant total</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmt(amount)} $</span>
              </div>
            </div>
          </div>

          {/* Note bas de page */}
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '11px', color: '#9b9b9b', lineHeight: 1.7 }}>
              Ce document constitue une facture de services de mannequinat à des fins comptables.
              Veuillez retourner ce document signé à luminaphotography.mtl@gmail.com.
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
