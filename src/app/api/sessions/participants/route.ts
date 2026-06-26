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
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }

  // Vérifie que la session existe avant d'insérer
  const sessionCheck = await fetch(
    `${url}/rest/v1/sessions?id=eq.${encodeURIComponent(body.session_id)}&select=id&limit=1`,
    { headers }
  )
  const [session] = await sessionCheck.json() as Array<{ id: string }>
  if (!session) return NextResponse.json({ success: false, message: 'Session introuvable.' }, { status: 404 })

  const res = await fetch(`${url}/rest/v1/session_models?select=id`, {
    method:  'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
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
  const [row] = await res.json() as Array<{ id: string }>

  return NextResponse.json({ success: true, data: { id: row.id } })
}
