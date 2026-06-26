// POST /api/sessions/participants — ajoute un participant externe (maquilleur, styliste, etc.)
// directement confirmé, sans email. Utilisé pour la facturation uniquement.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const body = await request.json() as {
    session_id: string
    prenom:     string
    nom?:       string | null
    email:      string
    role:       string
  }

  if (!body.session_id || !body.prenom || !body.email || !body.role) {
    return NextResponse.json({ success: false, message: 'Champs manquants.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(`${url}/rest/v1/session_models?select=id,token`, {
    method:  'POST',
    headers: {
      'apikey': key, 'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      session_id:   body.session_id,
      model_prenom: body.prenom,
      model_nom:    body.nom ?? null,
      model_email:  body.email,
      role:         body.role,
      status:       'confirmed',
    }),
  })

  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })
  const [row] = await res.json() as Array<{ id: string; token: string }>

  return NextResponse.json({ success: true, data: row })
}
