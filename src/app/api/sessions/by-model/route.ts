// GET /api/sessions/by-model?email= — historique des participations d'un modèle.
// Lien par model_email (session_models est dénormalisé, pas de candidature_id).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const email = request.nextUrl.searchParams.get('email')?.trim()
  if (!email) return NextResponse.json({ success: false, message: 'Email requis.' }, { status: 400 })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  // eq (match exact) plutôt qu'ilike : l'email vient de la même source des deux côtés
  // (candidature → session_models), donc casse identique. Évite l'injection d'opérateur
  // PostgREST où un pattern ilike (%, _) énumérerait toutes les participations.
  const res = await fetch(
    `${url}/rest/v1/session_models?model_email=eq.${encodeURIComponent(email)}` +
    `&select=id,role,status,payment_amount,email_delivered_at,email_clicked_at,email_bounced_at,session:sessions(project,date,type)` +
    `&order=created_at.desc`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  )
  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  return NextResponse.json({ success: true, data: await res.json() })
}
