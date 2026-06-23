// sessions/[id] GET — retourne les statuts de confirmation pour une session donnée.
// Protégé par cookie admin. Utilisé par SessionStatusPanel côté dashboard.
// Utilise le REST API Supabase directement (pas de SDK) — cohérent avec les autres routes.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  // Next.js 15 — params est une Promise, on l'await avant utilisation
  const { id } = await params

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(
    `${url}/rest/v1/session_models?session_id=eq.${encodeURIComponent(id)}&select=id,model_prenom,model_email,status,confirmed_at,cancelled_at,cancel_reason,group:session_groups(name,call_time)&order=created_at`,
    {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
    }
  )

  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  const data: Array<{
    id:            string
    model_prenom:  string
    model_email:   string
    status:        'pending' | 'confirmed' | 'cancelled'
    confirmed_at:  string | null
    cancelled_at:  string | null
    cancel_reason: string | null
    group:         { name: string; call_time: string } | null
  }> = await res.json()

  const confirmed = data.filter(m => m.status === 'confirmed').length
  const cancelled = data.filter(m => m.status === 'cancelled').length
  const pending   = data.filter(m => m.status === 'pending').length

  return NextResponse.json({ success: true, data, stats: { confirmed, cancelled, pending, total: data.length } })
}
