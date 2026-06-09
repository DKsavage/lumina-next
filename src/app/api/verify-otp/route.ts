import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

  const { access_token } = await authRes.json()
  return NextResponse.json({ success: true, token: access_token })
}
