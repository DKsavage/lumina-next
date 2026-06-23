// confirm GET — route publique (sans auth). Gère TOUT : lookup token, update statut,
// emails modèle + admin, redirect vers la page de confirmation.
// Sécurité : le token est un UUID unique généré par Supabase, impossible à deviner.
// Pas de SDK supabase-js — cohérent avec le reste du projet (REST API directe).
import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL } from '@/types/session'

const ADMIN_EMAIL = 'luminaphotography.mtl@gmail.com'

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY!
  return {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
  }
}

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from: 'Lumina Photography <casting@luminamodels.ca>',
      to:   [to],
      subject,
      html,
    }),
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token  = searchParams.get('token')
  const status = searchParams.get('status') as 'confirmed' | 'cancelled' | null
  const reason = searchParams.get('reason') ?? null

  // Paramètres obligatoires — token invalide → 400 sans redirect (lien cassé)
  if (!token || !status || !['confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const url     = process.env.SUPABASE_URL!
  const headers = supabaseHeaders()

  // Lookup session_models avec join sessions + session_groups
  // select= avec notation Supabase : relation!fk_name(champs)
  const smRes = await fetch(
    `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=id,model_email,model_prenom,model_langue,status,session_id,session:sessions(project,date,address,contact_name,contact_phone),group:session_groups(name,call_time,duration_min,look_brief,bring_items)&limit=1`,
    { headers },
  )

  if (!smRes.ok) {
    return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })
  }

  const rows = await smRes.json() as Array<{
    id:            string
    model_email:   string
    model_prenom:  string
    model_langue:  string
    status:        'pending' | 'confirmed' | 'cancelled'
    session_id:    string
    session:       { project: string; date: string; address: string; contact_name: string | null; contact_phone: string | null }
    group:         { name: string; call_time: string; duration_min: number | null; look_brief: string | null; bring_items: string | null } | null
  }>

  if (!rows.length) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })
  }

  const sm = rows[0]

  // Idempotence — si le statut est déjà le même, on redirige sans rien écrire
  if (sm.status === status) {
    return NextResponse.redirect(`${SITE_URL}/confirm/${token}`)
  }

  // Update — confirmed_at ou cancelled_at selon l'action
  const updateBody = status === 'confirmed'
    ? { status: 'confirmed', confirmed_at: new Date().toISOString(), cancelled_at: null, cancel_reason: null }
    : { status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: reason }

  await fetch(
    `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}`,
    {
      method:  'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body:    JSON.stringify(updateBody),
    },
  )

  const session      = sm.session
  const group        = sm.group
  const dateFr       = new Date(session.date + 'T12:00:00').toLocaleDateString('fr-CA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Email modèle — confirmation ou annulation douce
  const modelSubject = status === 'confirmed'
    ? `Participation confirmée — ${session.project}`
    : `Annulation enregistrée — ${session.project}`

  const modelHtml = status === 'confirmed'
    ? `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:#8B0020;"></td></tr>
  <tr><td style="padding:28px 40px 32px;">
    <span style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;color:#8B0020;font-weight:700;">Lumina</span>
    <span style="font-family:Georgia,serif;font-size:14px;letter-spacing:0.2em;text-transform:uppercase;color:#0a0a0a;font-weight:300;margin-left:6px;">Photography</span>
    <p style="margin:24px 0 12px;font-size:15px;color:#0a0a0a;line-height:1.7;">Bonjour <strong>${esc(sm.model_prenom)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;line-height:1.7;">Votre participation au projet <strong>${esc(session.project)}</strong> est confirmée ✓</p>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">Date</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;">${esc(dateFr)}</p>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">📍 Lieu</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;">${esc(session.address)}</p>
    ${group?.call_time ? `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;font-weight:600;">🕐 Votre call time</p><p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#8B0020;">${esc(group.call_time)}</p>` : ''}
    <p style="margin:24px 0 0;font-size:13px;color:#6b6b6b;line-height:1.7;">Au plaisir de vous retrouver !</p>
  </td></tr>
  <tr><td style="padding:16px 40px 24px;border-top:1px solid #e2e2e2;">
    <div style="font-size:12px;color:#6b6b6b;">
      <span style="font-family:Georgia,serif;font-size:14px;color:#8B0020;font-weight:700;">Lumina</span>
      <span style="font-family:Georgia,serif;font-size:12px;color:#0a0a0a;font-weight:300;margin-left:4px;">Photography</span><br>
      casting@luminamodels.ca · luminamodels.ca · Montréal
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`
    : `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:#8B0020;"></td></tr>
  <tr><td style="padding:28px 40px 32px;">
    <span style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;color:#8B0020;font-weight:700;">Lumina</span>
    <span style="font-family:Georgia,serif;font-size:14px;letter-spacing:0.2em;text-transform:uppercase;color:#0a0a0a;font-weight:300;margin-left:6px;">Photography</span>
    <p style="margin:24px 0 12px;font-size:15px;color:#0a0a0a;line-height:1.7;">Bonjour <strong>${esc(sm.model_prenom)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#0a0a0a;line-height:1.7;">Votre annulation pour le projet <strong>${esc(session.project)}</strong> a bien été enregistrée.</p>
    <p style="margin:0 0 0;font-size:14px;color:#6b6b6b;line-height:1.7;">Merci de nous avoir prévenus — nous comprenons que les imprévus arrivent. Nous espérons vous voir lors d'un prochain projet.</p>
  </td></tr>
  <tr><td style="padding:16px 40px 24px;border-top:1px solid #e2e2e2;">
    <div style="font-size:12px;color:#6b6b6b;">
      <span style="font-family:Georgia,serif;font-size:14px;color:#8B0020;font-weight:700;">Lumina</span>
      <span style="font-family:Georgia,serif;font-size:12px;color:#0a0a0a;font-weight:300;margin-left:4px;">Photography</span><br>
      casting@luminamodels.ca · luminamodels.ca · Montréal
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`

  await sendEmail(sm.model_email, modelSubject, modelHtml)

  // Notification admin uniquement si annulation — l'admin doit trouver un remplaçant
  if (status === 'cancelled') {
    const adminHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;">
  <tr><td style="height:4px;background:#8B0020;"></td></tr>
  <tr><td style="padding:24px 32px 28px;">
    <p style="margin:0 0 12px;font-size:15px;color:#0a0a0a;font-weight:700;">⚠ Annulation reçue</p>
    <p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Modèle :</strong> ${esc(sm.model_prenom)} (${esc(sm.model_email)})</p>
    <p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Projet :</strong> ${esc(session.project)}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Date :</strong> ${esc(dateFr)}</p>
    ${group?.name ? `<p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Groupe :</strong> ${esc(group.name)}${group.call_time ? ` · ${esc(group.call_time)}` : ''}</p>` : ''}
    <p style="margin:0 0 0;font-size:14px;color:#6b6b6b;"><strong>Raison :</strong> ${reason ? esc(reason) : 'Non fournie'}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`

    await sendEmail(ADMIN_EMAIL, `⚠ Annulation — ${sm.model_prenom} / ${session.project}`, adminHtml)
  }

  // Redirect vers la page de confirmation — elle relira la DB pour afficher le nouveau statut
  return NextResponse.redirect(`${SITE_URL}/confirm/${token}`)
}
