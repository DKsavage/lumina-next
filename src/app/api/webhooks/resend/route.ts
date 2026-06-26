// POST /api/webhooks/resend — reçoit les événements Resend (livraison, clic, bounce).
// Vérification signature Svix via HMAC-SHA256 (Node crypto, aucune dépendance externe).
// Référence : https://resend.com/docs/dashboard/webhooks/introduction
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Vérifie la signature Svix — protège contre les requêtes forgées.
// Le body doit être lu comme texte brut AVANT toute désérialisation JSON.
function verifySignature(body: string, req: NextRequest): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? ''
  if (!secret) return false

  const msgId        = req.headers.get('svix-id') ?? ''
  const msgTimestamp = req.headers.get('svix-timestamp') ?? ''
  const msgSignature = req.headers.get('svix-signature') ?? ''
  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Rejeter les messages de plus de 5 minutes — protection contre replay attacks
  const ts = parseInt(msgTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const secretBytes   = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${msgId}.${msgTimestamp}.${body}`
  const computed      = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  // svix-signature peut contenir plusieurs signatures séparées par des espaces
  return msgSignature.split(' ').some(sig => sig === `v1,${computed}`)
}

const FIELD_MAP: Record<string, string> = {
  'email.delivered': 'email_delivered_at',
  'email.clicked':   'email_clicked_at',
  'email.bounced':   'email_bounced_at',
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  if (!verifySignature(body, request)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body) as {
    type: string
    data: { email_id: string; created_at?: string }
  }

  const field = FIELD_MAP[payload.type]
  if (!field) return NextResponse.json({ ignored: true })

  const resendId = payload.data?.email_id
  if (!resendId) return NextResponse.json({ ignored: true })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  // Chercher le session_model correspondant à cet email Resend
  const lookupRes = await fetch(
    `${url}/rest/v1/session_models?resend_email_id=eq.${encodeURIComponent(resendId)}&select=id&limit=1`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  )
  if (!lookupRes.ok) return NextResponse.json({ error: 'DB lookup failed' }, { status: 500 })

  const [row] = await lookupRes.json() as Array<{ id: string }>
  if (!row) return NextResponse.json({ ignored: true })

  const patchRes = await fetch(`${url}/rest/v1/session_models?id=eq.${encodeURIComponent(row.id)}`, {
    method:  'PATCH',
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({ [field]: payload.data.created_at ?? new Date().toISOString() }),
  })

  if (!patchRes.ok) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  return NextResponse.json({ success: true, type: payload.type })
}
