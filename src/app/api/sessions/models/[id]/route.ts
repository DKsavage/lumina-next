// PATCH /api/sessions/models/[id] — mise à jour d'un session_model (payment_amount).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const patch: Record<string, unknown> = {}
  if (typeof body.payment_amount === 'number' && body.payment_amount >= 0) {
    patch.payment_amount = body.payment_amount
  }
  if (body.payment_amount === null) patch.payment_amount = null
  if (typeof body.role === 'string' && body.role.trim()) {
    patch.role = body.role.trim()
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, message: 'Champ invalide.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(`${url}/rest/v1/session_models?id=eq.${encodeURIComponent(id)}`, {
    method:  'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body:    JSON.stringify(patch),
  })

  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}
