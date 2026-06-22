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

/* ── DELETE — supprime la candidature + ses photos storage ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isValid = await verifyToken(request)
  if (!isValid) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  /* Récupérer les chemins photos avant suppression */
  const getRes = await fetch(
    `${url}/rest/v1/candidatures?id=eq.${id}&select=photo_profil_url,photo_body_url`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  )
  const [record] = await getRes.json()

  /* Supprimer photos du storage */
  if (record) {
    const paths = [record.photo_profil_url, record.photo_body_url]
      .filter(Boolean)
      .map((p: string) => p.replace('photos-candidatures/', ''))
    if (paths.length > 0) {
      await fetch(`${url}/storage/v1/object/photos-candidatures`, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
      }).catch(() => { /* storage cleanup best-effort */ })
    }
  }

  /* Supprimer la ligne DB */
  const delRes = await fetch(`${url}/rest/v1/candidatures?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'return=minimal' },
  })

  if (!delRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}

/* ── PATCH — mise à jour partielle (selectionne, etc.) ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isValid = await verifyToken(request)
  if (!isValid) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const url  = process.env.SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_KEY!
  const body = await request.json()

  const patchRes = await fetch(`${url}/rest/v1/candidatures?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(body),
  })

  if (!patchRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}
