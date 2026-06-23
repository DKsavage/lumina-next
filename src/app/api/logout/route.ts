// logout — efface les cookies httpOnly côté serveur.
// Un cookie httpOnly ne peut pas être supprimé côté client en JS.
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('lumina_token',   '', { maxAge: 0, path: '/' })
  response.cookies.set('lumina_refresh', '', { maxAge: 0, path: '/api/refresh' })
  return response
}
