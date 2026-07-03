// select POST — envoie l'email de sélection et marque selectionne=true en DB.
// Auth via cookie httpOnly. Aucun token dans le body de la requête.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { buildEmailWrapper } from '@/lib/email'

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
      html: buildEmailWrapper({
        projectName: 'Félicitations',
        subLabel:    'Tu as été sélectionné·e · You have been selected',
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour <strong>${prenom}</strong>,</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous avons le plaisir de t'informer que ton profil a été <strong>sélectionné</strong> pour un projet Flawa Models.</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Tu recevras très prochainement tous les détails concernant la session (date, lieu, heure de call time).</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;font-weight:700;">Merci de répondre à cet email pour confirmer ta disponibilité.</p>`,
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi <strong>${prenom}</strong>,</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We're pleased to let you know that your profile has been <strong>selected</strong> for a Flawa Models project.</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">You will receive all the details about the session (date, location, call time) very soon.</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;font-weight:700;">Please reply to this email to confirm your availability.</p>`,
      }),
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
