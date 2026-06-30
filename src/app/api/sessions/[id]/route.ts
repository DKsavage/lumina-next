// sessions/[id] — GET : statuts modèles + métadonnées session pour le panel de suivi et d'édition.
//                  PATCH : mise à jour champs session + groupes + email aux confirmés.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

function esc(s: string | null | undefined) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }

  // Fetch modèles + métadonnées session en parallèle
  const [modelsRes, sessionRes] = await Promise.all([
    fetch(
      `${url}/rest/v1/session_models?session_id=eq.${encodeURIComponent(id)}&select=id,role,model_prenom,model_nom,model_email,token,status,confirmed_at,cancelled_at,cancel_reason,email_delivered_at,email_clicked_at,email_bounced_at,payment_amount,group:session_groups(name,call_time)&order=created_at`,
      { headers }
    ),
    fetch(
      `${url}/rest/v1/sessions?id=eq.${encodeURIComponent(id)}&select=id,project,date,address,contact_name,contact_phone,notes_models,max_models,session_groups(id,name,call_time,sort_order)&limit=1`,
      { headers }
    ),
  ])

  if (!modelsRes.ok || !sessionRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const data: Array<{
    id:            string
    role:          string
    model_prenom:  string
    model_email:   string
    status:        'pending' | 'confirmed' | 'cancelled'
    confirmed_at:       string | null
    cancelled_at:       string | null
    cancel_reason:      string | null
    email_delivered_at: string | null
    email_clicked_at:   string | null
    email_bounced_at:   string | null
    payment_amount:     number | null
    token:              string
    model_nom:          string | null
    group:              { name: string; call_time: string } | null
  }> = await modelsRes.json()

  const [sessionRow] = await sessionRes.json() as Array<{
    id: string; project: string; date: string; address: string
    contact_name: string | null; contact_phone: string | null; notes_models: string | null
    max_models: number | null
    session_groups: Array<{ id: string; name: string; call_time: string; sort_order: number }>
  }>

  const confirmed = data.filter(m => m.status === 'confirmed').length
  const cancelled = data.filter(m => m.status === 'cancelled').length
  const pending   = data.filter(m => m.status === 'pending').length

  return NextResponse.json({ success: true, data, stats: { confirmed, cancelled, pending, total: data.length }, session: sessionRow ?? null })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

interface PatchBody {
  date?:          string
  address?:       string
  contact_name?:  string | null
  contact_phone?: string | null
  notes_models?:  string | null
  max_models?:    number | null
  groups?:        Array<{ id: string; call_time: string }>
  notify:         boolean   // envoyer email aux modèles confirmés
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const body: PatchBody = await request.json()

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
  if (body.date && !ISO_DATE.test(body.date)) {
    return NextResponse.json({ success: false, message: 'Format de date invalide.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = {
    'apikey': key, 'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json', 'Prefer': 'return=minimal',
  }

  // 1. Mise à jour des champs session
  const sessionPatch: Record<string, unknown> = {}
  if (body.date          !== undefined) sessionPatch.date          = body.date
  if (body.address       !== undefined) sessionPatch.address       = body.address
  if (body.contact_name  !== undefined) sessionPatch.contact_name  = body.contact_name
  if (body.contact_phone !== undefined) sessionPatch.contact_phone = body.contact_phone
  if (body.notes_models  !== undefined) sessionPatch.notes_models  = body.notes_models
  if (body.max_models    !== undefined) sessionPatch.max_models    = body.max_models

  if (Object.keys(sessionPatch).length > 0) {
    const sRes = await fetch(`${url}/rest/v1/sessions?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers, body: JSON.stringify(sessionPatch),
    })
    if (!sRes.ok) return NextResponse.json({ success: false, message: 'Erreur mise à jour session.' }, { status: 502 })
  }

  // 2. Mise à jour des call times par groupe
  if (body.groups?.length) {
    await Promise.all(body.groups.map(g =>
      fetch(`${url}/rest/v1/session_groups?id=eq.${encodeURIComponent(g.id)}`, {
        method: 'PATCH', headers, body: JSON.stringify({ call_time: g.call_time }),
      })
    ))
  }

  // 3. Email de mise à jour aux modèles confirmés (opt-in)
  if (body.notify) {
    const [sessionRes, modelsRes] = await Promise.all([
      fetch(`${url}/rest/v1/sessions?id=eq.${encodeURIComponent(id)}&select=project,date,address,contact_name,contact_phone&limit=1`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }),
      fetch(`${url}/rest/v1/session_models?session_id=eq.${encodeURIComponent(id)}&status=eq.confirmed&select=model_prenom,model_email,group:session_groups(name,call_time)`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }),
    ])

    if (sessionRes.ok && modelsRes.ok) {
      const [session] = await sessionRes.json() as Array<{ project: string; date: string; address: string; contact_name: string | null; contact_phone: string | null }>
      const confirmedModels: Array<{ model_prenom: string; model_email: string; group: { name: string; call_time: string } | null }> = await modelsRes.json()

      const dateFr = new Date(session.date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

      await Promise.all(confirmedModels.map(m => fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Flawa Models <casting@luminamodels.ca>',
          reply_to: 'luminaphotography.mtl@gmail.com',
          to: [m.model_email],
          subject: `Mise à jour — ${session.project}`,
          html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:#8B0020;"></td></tr>
  <tr><td style="padding:28px 40px 32px;">
    <span style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;color:#8B0020;font-weight:700;">Flawa Models</span>
    <p style="margin:24px 0 12px;font-size:15px;color:#0a0a0a;line-height:1.7;">Bonjour <strong>${esc(m.model_prenom)}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#0a0a0a;line-height:1.7;">Des informations ont été mises à jour pour votre convocation au projet <strong>${esc(session.project)}</strong>.</p>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">Date</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;">${esc(dateFr)}</p>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">📍 Lieu</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;">${esc(session.address)}</p>
    ${m.group?.call_time ? `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">🕐 Votre call time</p><p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#8B0020;">${esc(m.group.call_time)}</p>` : ''}
    ${session.contact_name ? `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">Contact</p><p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;">${esc(session.contact_name)}${session.contact_phone ? ` · ${esc(session.contact_phone)}` : ''}</p>` : ''}
    <p style="margin:16px 0 0;font-size:13px;color:#6b6b6b;line-height:1.7;">En cas de question, répondez à cet email.</p>
  </td></tr>
  <tr><td style="padding:16px 40px 24px;border-top:1px solid #e2e2e2;">
    <div style="font-size:12px;color:#6b6b6b;">
      <span style="font-family:Georgia,serif;font-size:14px;color:#8B0020;font-weight:700;">Flawa Models</span><br>
      casting@luminamodels.ca · luminamodels.ca · Montréal
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
        }),
      })))
    }
  }

  return NextResponse.json({ success: true })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }

  // Cascade manuelle : modèles → groupes → session
  const [r1, r2] = await Promise.all([
    fetch(`${url}/rest/v1/session_models?session_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers }),
    fetch(`${url}/rest/v1/session_groups?session_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers }),
  ])
  if (!r1.ok || !r2.ok) return NextResponse.json({ success: false, message: 'Erreur suppression modèles/groupes.' }, { status: 502 })

  const r3 = await fetch(`${url}/rest/v1/sessions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers })
  if (!r3.ok) return NextResponse.json({ success: false, message: 'Erreur suppression session.' }, { status: 502 })

  return NextResponse.json({ success: true })
}
