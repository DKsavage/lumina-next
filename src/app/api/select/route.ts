// select POST — envoie l'email de sélection et marque selectionne=true en DB.
// Auth via cookie httpOnly. Aucun token dans le body de la requête.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = await verifyToken(request)
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Session expirée. Reconnecte-toi.' },
      { status: 401 }
    )
  }

  const { email, prenom, nom } = await request.json()

  if (!email || !prenom) {
    return NextResponse.json({ success: false, message: 'Données manquantes.' }, { status: 400 })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:     'Flawa Models <casting@luminamodels.ca>',
      reply_to: 'luminaphotography.mtl@gmail.com',
      to:       [email],
      subject:  'Félicitations — Tu as été sélectionné(e) par Flawa Models',
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:#d4293a;"></td></tr>
  <tr><td style="padding:28px 40px 0;">
    <span style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;color:#d4293a;font-weight:700;">Flawa Models</span>
  </td></tr>
  <tr><td style="padding:24px 40px 32px;">
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Bonjour <strong>${prenom}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Nous avons le plaisir de t'informer que ton profil a été <strong>sélectionné</strong> pour un projet Flawa Models.</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Tu recevras très prochainement tous les détails concernant la session (date, lieu, heure de call time).</p>
    <p style="margin:0 0 32px;font-size:15px;color:#0a0a0a;line-height:1.7;"><strong>Merci de répondre à cet email pour confirmer ta disponibilité.</strong></p>
    <hr style="border:none;border-top:1px solid #e2e2e2;margin:0 0 20px;">
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Hi <strong>${prenom}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">We're pleased to let you know that your profile has been <strong>selected</strong> for a Flawa Models project.</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">You will receive all the details about the session (date, location, call time) very soon.</p>
    <p style="margin:0 0 0;font-size:15px;color:#0a0a0a;line-height:1.7;"><strong>Please reply to this email to confirm your availability.</strong></p>
  </td></tr>
  <tr><td style="padding:0 40px 28px;">
    <div style="border-top:1px solid #e2e2e2;padding-top:16px;">
      <span style="font-family:Georgia,serif;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#d4293a;font-weight:700;">Flawa Models</span>
      <div style="font-size:12px;color:#6b6b6b;margin-top:4px;">casting@luminamodels.ca &nbsp;·&nbsp; luminamodels.ca</div>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.text()
    console.error('Resend error:', err)
    return NextResponse.json(
      { success: false, message: "Erreur lors de l'envoi de l'email." },
      { status: 500 }
    )
  }

  /* Marque le candidat comme sélectionné en DB */
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!
  await fetch(`${supabaseUrl}/rest/v1/candidatures?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'apikey':        supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({ selectionne: true }),
  })

  return NextResponse.json({ success: true })
}
