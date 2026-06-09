import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: 'Email et mot de passe requis.' },
      { status: 400 }
    )
  }

  const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey':       process.env.SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!authRes.ok) {
    return NextResponse.json(
      { success: false, message: 'Email ou mot de passe incorrect.' },
      { status: 401 }
    )
  }

  const { access_token } = await authRes.json()
  return NextResponse.json({ success: true, token: access_token })
}
