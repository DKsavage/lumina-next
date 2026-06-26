// GET /api/statut?email=... — lecture publique, rate-limit 30s/IP.
// Retourne uniquement un statut agrégé — pas de données personnelles.
import { NextRequest, NextResponse } from 'next/server'

const rl = new Map<string, number>()

export async function GET(req: NextRequest) {
  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  if ((rl.get(ip) ?? 0) > now - 30_000) {
    return NextResponse.json({ success: false, message: 'Trop de requêtes.' }, { status: 429 })
  }
  rl.set(ip, now)

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ success: false, message: 'Email invalide.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(
    `${url}/rest/v1/candidatures?email=eq.${encodeURIComponent(email)}&select=selectionne,archived&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 })

  const rows = await res.json() as { selectionne: boolean; archived: boolean }[]
  if (!rows.length) return NextResponse.json({ success: true, statut: 'non_trouve' })

  const { selectionne, archived } = rows[0]
  const statut = archived ? 'archive' : selectionne ? 'retenu' : 'en_attente'
  return NextResponse.json({ success: true, statut })
}
