import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
