import { NextResponse } from 'next/server'

async function verifyToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false

  const accessToken = authHeader.split(' ')[1]
  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey':        process.env.SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  return userRes.ok
}

export async function GET(request: Request) {
  const isValid = await verifyToken(request)
  if (!isValid) {
    return NextResponse.json({ success: false, message: 'Session expirée. Reconnecte-toi.' }, { status: 401 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  /* ── 1. Lire toutes les candidatures, plus récentes en premier ── */
  const dbRes = await fetch(`${url}/rest/v1/candidatures?select=*&order=date_inscription.desc`, {
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
    },
  })

  if (!dbRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const candidatures = await dbRes.json()

  /* ── 2. Collecter les chemins des photos (sans le préfixe bucket) ── */
  const paths: string[] = []
  candidatures.forEach((c: Record<string, string>) => {
    if (c.photo_profil_url) paths.push(c.photo_profil_url.replace('photos-candidatures/', ''))
    if (c.photo_body_url)   paths.push(c.photo_body_url.replace('photos-candidatures/', ''))
  })

  /* ── 3. URLs signées en batch — 24h d'expiry ── */
  const signedMap: Record<string, string> = {}

  if (paths.length > 0) {
    const signRes  = await fetch(`${url}/storage/v1/object/sign/photos-candidatures`, {
      method: 'POST',
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ paths, expiresIn: 86400 }),
    })

    const signData: Array<{ path: string; signedURL?: string }> = await signRes.json()
    signData.forEach(item => {
      if (item.signedURL) signedMap[item.path] = `${url}/storage/v1${item.signedURL}`
    })
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

  return NextResponse.json({ success: true, data: result })
}
