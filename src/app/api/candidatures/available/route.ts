// candidatures/available GET — retourne les modèles disponibles pour une date donnée.
// Filtre : non archivés + disponibilité compatible + aucun conflit session (status=confirmed).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

function isWeekend(isoDate: string): boolean {
  // UTC noon to avoid timezone shift on date boundary
  const d = new Date(isoDate + 'T12:00:00Z')
  const day = d.getUTCDay() // 0=Sunday, 6=Saturday
  return day === 0 || day === 6
}

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, message: 'date invalide' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = {
    apikey:        key,
    Authorization: `Bearer ${key}`,
  }

  // 1. Confirmed model emails on this date
  const sessRes = await fetch(
    `${url}/rest/v1/sessions?date=eq.${date}&select=session_models(model_email,status)`,
    { headers },
  )
  if (!sessRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const sessions: Array<{ session_models: Array<{ model_email: string; status: string }> }> =
    await sessRes.json()

  const blockedEmails = new Set(
    sessions
      .flatMap(s => s.session_models)
      .filter(m => m.status === 'confirmed')
      .map(m => m.model_email),
  )

  // 2. All non-archived candidatures
  const candRes = await fetch(
    `${url}/rest/v1/candidatures?archived=eq.false&select=id,prenom,nom,email,genre,taille,tier,disponibilite`,
    { headers },
  )
  if (!candRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const rows: Array<{
    id: string; prenom: string; nom: string; email: string
    genre: string | null; taille: number | null
    tier: string | null; disponibilite: string | null
  }> = await candRes.json()

  const weekend = isWeekend(date)

  const data = rows
    .filter(c => {
      if (blockedEmails.has(c.email)) return false
      const d = c.disponibilite
      if (!d || d === 'Flexible' || d === 'Voyages OK') return true
      if (weekend  && d === 'Weekends')         return true
      if (!weekend && d === 'Jours de semaine') return true
      return false
    })
    .map(({ email: _email, ...rest }) => rest) // strip email from UI payload

  return NextResponse.json({ success: true, data })
}
