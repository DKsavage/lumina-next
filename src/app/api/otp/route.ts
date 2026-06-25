import { NextResponse } from 'next/server'

// Map en mémoire : reset au cold start, suffisant pour limiter le flood sur un seul worker
const rateLimitMap = new Map<string, number>()

export async function POST(request: Request) {
  // Cooldown 60s par IP — empêche le flood vers Supabase Auth avant que son propre rate limit s'applique
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const last = rateLimitMap.get(ip) ?? 0
  if (Date.now() - last < 60_000) {
    return NextResponse.json(
      { success: false, message: 'Trop de tentatives. Réessaie dans une minute.' },
      { status: 429 }
    )
  }
  rateLimitMap.set(ip, Date.now())

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ success: false, message: 'Email requis.' }, { status: 400 })
  }

  const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      'apikey':       process.env.SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    /* createUser: false → seuls les admins déjà enregistrés dans Supabase Auth reçoivent un code */
    body: JSON.stringify({ email, createUser: false }),
  })

  if (!authRes.ok) {
    const errBody = await authRes.json().catch(() => ({}))
    if (errBody.error_code === 'over_email_send_rate_limit') {
      return NextResponse.json(
        { success: false, message: 'Trop de tentatives. Réessaie dans quelques minutes.' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Email non reconnu.' },
      { status: 401 }
    )
  }

  return NextResponse.json({ success: true })
}
