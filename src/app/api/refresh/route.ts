import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { refreshToken } = await request.json()
  if (!refreshToken) return NextResponse.json({ success: false }, { status: 400 })

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

  if (!res.ok) return NextResponse.json({ success: false }, { status: 401 })

  const { access_token, refresh_token } = await res.json()
  return NextResponse.json({ success: true, token: access_token, refreshToken: refresh_token })
}
