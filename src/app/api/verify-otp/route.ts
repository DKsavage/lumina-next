// verify-otp — vérifie le code OTP Supabase et pose les cookies httpOnly.
// Le token ne transite jamais dans le body de réponse : invisible au JS client.
import { NextRequest, NextResponse } from 'next/server'

const COOLDOWN = 30_000
// Clé ip:email — un attaquant ne peut pas amortir le brute force sur plusieurs comptes
// en changeant simplement d'IP (x-vercel-forwarded-for n'est pas spoofable côté client)
const rateLimitMap = new Map<string, number>()

export async function POST(request: NextRequest) {
  const { email, token } = await request.json()

  const ip = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    ?? 'unknown'
  // Clé combinée : même IP + email différent = nouvelle tentative bloquée
  const key = `${ip}:${(email ?? '').toLowerCase()}`

  // Éviction des entrées périmées avant insert pour borner la Map
  for (const [k, v] of rateLimitMap) {
    if (Date.now() - v > COOLDOWN) rateLimitMap.delete(k)
  }

  const last = rateLimitMap.get(key) ?? 0
  if (Date.now() - last < COOLDOWN) {
    return NextResponse.json(
      { success: false, message: 'Trop de tentatives. Réessaie dans quelques secondes.' },
      { status: 429 }
    )
  }
  rateLimitMap.set(key, Date.now())

  if (!email || !token) {
    return NextResponse.json(
      { success: false, message: 'Email et code requis.' },
      { status: 400 }
    )
  }

  const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'apikey':       process.env.SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'email', email, token }),
  })

  if (!authRes.ok) {
    return NextResponse.json(
      { success: false, message: 'Code invalide ou expiré.' },
      { status: 401 }
    )
  }

  const { access_token, refresh_token } = await authRes.json()

  const response = NextResponse.json({ success: true })

  response.cookies.set('lumina_token', access_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   3600,
    path:     '/',
  })

  response.cookies.set('lumina_refresh', refresh_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   2592000,
    path:     '/api/refresh',
  })

  return response
}
