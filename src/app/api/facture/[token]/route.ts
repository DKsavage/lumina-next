// GET /api/facture/[token] — données publiques pour la page facture.
// Pas d'auth — le token UUID est suffisant comme preuve d'identité.
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const res = await fetch(
    `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=token,role,model_prenom,model_nom,model_email,payment_amount,invoice_number,session:sessions(project,date,compensation_json)&limit=1`,
    { headers, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  const [row] = await res.json() as Array<{
    token:          string
    role:           string
    model_prenom:   string
    model_nom:      string | null
    model_email:    string
    payment_amount: number | null
    invoice_number: string | null
    session: {
      project:          string
      date:             string
      compensation_json: { type: string; amount: string | null; payment_method: string | null } | null
    } | null
  }>

  if (!row) return NextResponse.json({ success: false, message: 'Lien invalide.' }, { status: 404 })

  // L'adresse est liée au modèle (candidatures), pas à cette facture précise.
  const cRes = await fetch(
    `${url}/rest/v1/candidatures?email=eq.${encodeURIComponent(row.model_email)}&select=adresse&limit=1`,
    { headers, cache: 'no-store' }
  )
  const [candidature] = cRes.ok ? await cRes.json() as Array<{ adresse: string | null }> : [{ adresse: null }]

  return NextResponse.json({ success: true, data: { ...row, adresse: candidature?.adresse ?? null } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  const body = await req.json() as { payment_amount?: number | null; adresse?: string }
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }

  if (body.payment_amount !== undefined) {
    const res = await fetch(`${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ payment_amount: body.payment_amount }),
    })
    if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })
  }

  if (typeof body.adresse === 'string') {
    // Récupérer le model_email de la facture pour cibler la bonne candidature
    const mRes = await fetch(
      `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=model_email&limit=1`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    )
    if (!mRes.ok) return NextResponse.json({ success: false }, { status: 500 })
    const [row] = await mRes.json() as Array<{ model_email: string }>
    if (!row) return NextResponse.json({ success: false }, { status: 404 })

    const aRes = await fetch(`${url}/rest/v1/candidatures?email=eq.${encodeURIComponent(row.model_email)}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ adresse: body.adresse }),
    })
    if (!aRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
