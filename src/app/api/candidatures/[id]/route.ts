// candidatures/[id] — DELETE et PATCH sur une candidature individuelle.
// Auth via cookie httpOnly. UUID validé avant tout appel Supabase.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* ── DELETE — supprime la candidature + ses photos storage ── */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await verifyToken(request)
  if (!token) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ success: false }, { status: 400 })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  /* Récupérer les chemins photos avant suppression */
  const getRes = await fetch(
    `${url}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}&select=photo_profil_url,photo_body_url`,
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
  const delRes = await fetch(`${url}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'return=minimal' },
  })

  if (!delRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}

/* ── PATCH — mise à jour partielle (selectionne uniquement) ── */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await verifyToken(request)
  if (!token) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ success: false }, { status: 400 })

  const url  = process.env.SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_KEY!
  const body = await request.json()

  /* Allowlist — selectionne et archived sont les seuls champs modifiables */
  const patch: Record<string, boolean> = {}
  if (typeof body.selectionne === 'boolean') patch.selectionne = body.selectionne
  if (typeof body.archived    === 'boolean') patch.archived    = body.archived
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, message: 'Champ invalide.' }, { status: 400 })
  }

  const patchRes = await fetch(`${url}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(patch),
  })

  if (!patchRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}
