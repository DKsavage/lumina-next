// GET /api/factures — liste des factures (session_models avec payment_amount non-null),
// filtrée et groupée par modèle ou par session.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { filterInvoices, groupByModel, groupBySession, type InvoiceRow, type InvoiceStatus } from '@/lib/factures'

const VALID_STATUSES: InvoiceStatus[] = ['pending', 'sent', 'paid']

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const groupBy   = searchParams.get('groupBy') === 'model' ? 'model' : 'session'
  const statusRaw = searchParams.get('status')
  const status    = VALID_STATUSES.includes(statusRaw as InvoiceStatus) ? (statusRaw as InvoiceStatus) : undefined
  const from      = searchParams.get('from') ?? undefined
  const to        = searchParams.get('to') ?? undefined
  const q         = searchParams.get('q') ?? undefined

  const url  = process.env.SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const res = await fetch(
    `${url}/rest/v1/session_models?payment_amount=not.is.null&select=id,invoice_number,invoice_status,token,role,model_prenom,model_nom,model_email,payment_amount,session:sessions(id,project,date)`,
    { headers, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  const raw = await res.json() as Array<{
    id: string; invoice_number: string | null; invoice_status: string | null
    token: string; role: string; model_prenom: string; model_nom: string | null
    model_email: string; payment_amount: number | null
    session: { id: string; project: string; date: string } | null
  }>

  const rows: InvoiceRow[] = raw
    .filter((r): r is typeof raw[number] & { session: NonNullable<typeof raw[number]['session']> } => r.session !== null)
    .map(r => ({
      id:             r.id,
      invoice_number: r.invoice_number,
      invoice_status: (VALID_STATUSES.includes(r.invoice_status as InvoiceStatus) ? r.invoice_status : 'pending') as InvoiceStatus,
      token:          r.token,
      role:           r.role,
      model_prenom:   r.model_prenom,
      model_nom:      r.model_nom,
      model_email:    r.model_email,
      payment_amount: r.payment_amount,
      session_id:     r.session.id,
      project:        r.session.project,
      date:           r.session.date,
    }))

  const filtered = filterInvoices(rows, { status, from, to, q })
  const data = groupBy === 'model' ? groupByModel(filtered) : groupBySession(filtered)

  return NextResponse.json({ success: true, data, groupBy })
}
