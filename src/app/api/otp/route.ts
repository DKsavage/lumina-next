import { NextResponse } from 'next/server'

const COOLDOWN = 60_000
// Map en mémoire par instance — complétée par le rate limit Supabase côté Auth
const rateLimitMap = new Map<string, number>()

export async function POST(request: Request) {
  // x-vercel-forwarded-for est posé par l'infra Vercel (non spoofable par le client),
  // contrairement à x-forwarded-for qui est client-supplied
  const ip = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    ?? 'unknown'

  // Éviction des entrées périmées avant insert pour borner la Map
  for (const [k, v] of rateLimitMap) {
    if (Date.now() - v > COOLDOWN) rateLimitMap.delete(k)
  }

  const last = rateLimitMap.get(ip) ?? 0
  if (Date.now() - last < COOLDOWN) {
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
