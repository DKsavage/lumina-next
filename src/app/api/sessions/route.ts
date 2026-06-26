// sessions GET — liste toutes les sessions avec leurs stats de confirmation.
// Embed session_models(status) pour agréger en une seule requête sans N+1.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(
    `${url}/rest/v1/sessions?select=id,project,type,date,status,created_at,max_models,session_models(status)&order=date.desc`,
    {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
      },
    }
  )

  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  const rows: Array<{
    id:             string
    project:        string
    type:           string
    date:           string
    status:         string
    created_at:     string
    max_models:     number | null
    session_models: Array<{ status: string }>
  }> = await res.json()

  const sessions = rows.map(({ session_models, ...rest }) => {
    const models    = session_models ?? []
    const confirmed = models.filter(m => m.status === 'confirmed').length
    const cancelled = models.filter(m => m.status === 'cancelled').length
    const pending   = models.filter(m => m.status === 'pending').length
    return { ...rest, stats: { confirmed, cancelled, pending, total: models.length } }
  })

  return NextResponse.json({ success: true, data: sessions })
}
