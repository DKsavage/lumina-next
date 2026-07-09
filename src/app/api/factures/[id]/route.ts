// PATCH /api/factures/[id] — met à jour le statut d'une facture (session_models.invoice_status).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const VALID_STATUSES = ['pending', 'sent', 'paid']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { invoice_status?: string }

  if (!body.invoice_status || !VALID_STATUSES.includes(body.invoice_status)) {
    return NextResponse.json({ success: false, message: 'Statut invalide.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(`${url}/rest/v1/session_models?id=eq.${encodeURIComponent(id)}`, {
    method:  'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ invoice_status: body.invoice_status }),
  })

  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}
