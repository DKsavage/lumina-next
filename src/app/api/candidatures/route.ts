// candidatures GET — liste toutes les candidatures avec photos signées.
// Auth via cookie httpOnly lu par verifyToken (src/lib/auth.ts).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = await verifyToken(request)
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Session expirée. Reconnecte-toi.' },
      { status: 401 }
    )
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  /* ── 1. Lire les candidatures paginées, plus récentes en premier ── */
  const { searchParams } = new URL(request.url)
  const limit          = Math.min(Number(searchParams.get('limit')  ?? '200'), 500)
  const offset         = Math.max(Number(searchParams.get('offset') ?? '0'),   0)
  const showArchived   = searchParams.get('archived') === 'true'
  const archivedFilter = showArchived ? 'archived=eq.true' : 'archived=eq.false'

  const dbRes = await fetch(
    `${url}/rest/v1/candidatures?select=*&${archivedFilter}&order=date_inscription.desc&limit=${limit}&offset=${offset}`,
    {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        // count=exact → Supabase retourne Content-Range: 0-199/543 pour connaître le total
        'Prefer':        'count=exact',
      },
    }
  )

  if (!dbRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const candidatures = await dbRes.json()
  const contentRange = dbRes.headers.get('content-range') ?? ''
  const total        = parseInt(contentRange.split('/')[1] ?? '0', 10) || candidatures.length
  const hasMore      = offset + limit < total

  /* ── 2. Collecter les chemins des photos (sans le préfixe bucket) ── */
  const paths: string[] = []
  candidatures.forEach((c: Record<string, string>) => {
    if (c.photo_profil_url) paths.push(c.photo_profil_url.replace('photos-candidatures/', ''))
    if (c.photo_body_url)   paths.push(c.photo_body_url.replace('photos-candidatures/', ''))
  })

  /* ── 3. URLs signées en batch — 24h d'expiry ── */
  const signedMap: Record<string, string> = {}

  if (paths.length > 0) {
    const signRes = await fetch(`${url}/storage/v1/object/sign/photos-candidatures`, {
      method: 'POST',
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ paths, expiresIn: 86400 }),
    })

    // Storage peut retourner 503/quota — on dégrade gracieusement plutôt que crasher sur forEach
    if (signRes.ok) {
      const signData: Array<{ path: string; signedURL?: string }> = await signRes.json()
      signData.forEach(item => {
        if (item.signedURL) signedMap[item.path] = `${url}/storage/v1${item.signedURL}`
      })
    }
  }

  /* ── 4. Attacher les URLs signées à chaque candidature ── */
  const result = candidatures.map((c: Record<string, string | null>) => ({
    ...c,
    photo_profil_signed: c.photo_profil_url
      ? signedMap[c.photo_profil_url.replace('photos-candidatures/', '')] ?? null
      : null,
    photo_body_signed: c.photo_body_url
      ? signedMap[c.photo_body_url.replace('photos-candidatures/', '')] ?? null
      : null,
  }))

  // Nombre d'archivées — pour badge dans les filtres (requête légère, count only)
  let archivedCount = 0
  if (!showArchived) {
    const countRes = await fetch(
      `${url}/rest/v1/candidatures?archived=eq.true&select=id`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'count=exact', 'Range': '0-0' } }
    )
    const cr = countRes.headers.get('content-range') ?? ''
    archivedCount = parseInt(cr.split('/')[1] ?? '0', 10) || 0
  }

  return NextResponse.json({ success: true, data: result, total, hasMore, offset, archivedCount })
}
