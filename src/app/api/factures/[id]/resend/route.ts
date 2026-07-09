// POST /api/factures/[id]/resend — renvoie l'email "Paiement" à un modèle précis
// (contrairement à /api/sessions/remind qui cible tous les modèles confirmés d'une
// session à la fois — ici on cible une seule ligne session_models par son id).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { buildReminderHtml } from '@/app/api/sessions/remind/route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const mRes = await fetch(
    `${url}/rest/v1/session_models?id=eq.${encodeURIComponent(id)}&select=model_prenom,model_email,token,group:session_groups(call_time),session:sessions(project,date,address,contact_name,contact_phone,compensation_json)&limit=1`,
    { headers }
  )
  if (!mRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const [row] = await mRes.json() as Array<{
    model_prenom: string; model_email: string; token: string
    group:   { call_time: string } | null
    session: {
      project: string; date: string; address: string
      contact_name: string | null; contact_phone: string | null
      compensation_json: { amount: string | null; payment_method: string | null; delay: string | null } | null
    } | null
  }>
  if (!row || !row.session) return NextResponse.json({ success: false, message: 'Facture introuvable.' }, { status: 404 })

  const comp = row.session.compensation_json
  const { subject, html } = buildReminderHtml('paiement', {
    prenom:             row.model_prenom,
    project:            row.session.project,
    date:               row.session.date,
    address:            row.session.address,
    callTime:           row.group?.call_time ?? null,
    contactName:        row.session.contact_name,
    contactPhone:       row.session.contact_phone,
    token:              row.token,
    compensationAmount: comp?.amount ?? null,
    compensationMethod: comp?.payment_method ?? null,
    compensationDelay:  comp?.delay ?? null,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Flawa Models <casting@luminamodels.ca>', to: [row.model_email], subject, html }),
  })
  if (!res.ok) return NextResponse.json({ success: false }, { status: 502 })

  return NextResponse.json({ success: true })
}
