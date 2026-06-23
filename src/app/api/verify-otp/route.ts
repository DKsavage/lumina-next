// verify-otp — vérifie le code OTP Supabase et pose les cookies httpOnly.
// Le token ne transite jamais dans le body de réponse : invisible au JS client.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, token } = await request.json()

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
