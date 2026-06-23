// refresh — renouvelle le token Supabase depuis le cookie lumina_refresh.
// Pose de nouveaux cookies httpOnly sans exposer les tokens au client JS.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('lumina_refresh')?.value
  if (!refreshToken) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const res = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'apikey':       process.env.SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  )

  if (!res.ok) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const { access_token, refresh_token } = await res.json()

  const response = NextResponse.json({ success: true })

  response.cookies.set('lumina_token', access_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   3600,
    path:     '/admin',
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
