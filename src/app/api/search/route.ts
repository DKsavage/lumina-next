// GET /api/search?q= — recherche globale candidatures + sessions.
// Deux requêtes Supabase en parallèle, max 5 résultats chacune.
// Auth obligatoire — route admin uniquement.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ candidatures: [], sessions: [] })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const h   = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  // Encoder le wildcard ilike — PostgREST : or=(prenom.ilike.*q*,nom.ilike.*q*)
  const like = encodeURIComponent(`*${q}*`)

  const [cRes, sRes] = await Promise.all([
    fetch(
      `${url}/rest/v1/candidatures?or=(prenom.ilike.${like},nom.ilike.${like},email.ilike.${like},ville.ilike.${like})&archived=eq.false&select=id,prenom,nom,email,ville,genre,photo_profil_url&order=date_inscription.desc&limit=5`,
      { headers: h }
    ),
    fetch(
      `${url}/rest/v1/sessions?project=ilike.${like}&select=id,project,type,date&order=date.desc&limit=5`,
      { headers: h }
    ),
  ])

  const [candidatures, sessions] = await Promise.all([
    cRes.ok ? cRes.json() : [],
    sRes.ok ? sRes.json() : [],
  ])

  return NextResponse.json({ candidatures, sessions })
}
