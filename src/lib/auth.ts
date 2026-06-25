// auth.ts — vérifie le cookie lumina_token sur chaque requête admin.
// Retourne l'access_token si valide, null si absent ou expiré.
// Utilisé par toutes les routes protégées : candidatures, select, send-session.
import type { NextRequest } from 'next/server'

export async function verifyToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('lumina_token')?.value
  if (!token) return null

  // Timeout 5s : si Supabase Auth est down, on ne bloque pas la route admin indéfiniment
  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey':        process.env.SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null)

  return userRes?.ok ? token : null
}
