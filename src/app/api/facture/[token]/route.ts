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
    `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=token,role,model_prenom,model_nom,model_email,payment_amount,session:sessions(project,date,compensation_json)&limit=1`,
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
    session: {
      project:          string
      date:             string
      compensation_json: { type: string; amount: string | null; payment_method: string | null } | null
    } | null
  }>

  if (!row) return NextResponse.json({ success: false, message: 'Lien invalide.' }, { status: 404 })

  return NextResponse.json({ success: true, data: row })
}
