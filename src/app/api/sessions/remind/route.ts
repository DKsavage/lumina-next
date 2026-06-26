// remind POST — envoie les rappels de confirmation aux modèles non-répondants.
// Appelé manuellement depuis le dashboard (bouton "Relancer").
// Évite les doublons via les champs reminder_*_sent_at.
// Utilise le REST API Supabase directement (pas de SDK) — cohérent avec les autres routes.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SITE_URL } from '@/types/session'

type ReminderType = 'j5' | 'j2' | 'j1' | 'morning' | 'merci' | 'paiement'

// Échappement HTML — même fonction que dans confirm/route.ts et send-session/route.ts.
// Protège contre l'injection de balises dans les emails si un champ Supabase est corrompu.
function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function sentAtField(type: ReminderType): string {
  return {
    j5:       'reminder_j5_sent_at',
    j2:       'reminder_j2_sent_at',
    j1:       'reminder_j1_sent_at',
    morning:  'reminder_morning_sent_at',
    merci:    'reminder_merci_sent_at',
    paiement: 'reminder_paiement_sent_at',
  }[type]
}

function buildReminderHtml(type: ReminderType, params: {
  prenom:              string
  project:             string
  date:                string
  address:             string
  callTime:            string | null
  contactName:         string | null
  contactPhone:        string | null
  token:               string
  compensationAmount?: string | null
  compensationMethod?: string | null
  compensationDelay?:  string | null
}): { subject: string; html: string } {
  const { prenom, project, date, address, callTime, contactName, contactPhone, token,
    compensationAmount, compensationMethod, compensationDelay } = params
  const confirmUrl  = `${SITE_URL}/confirm/${token}?status=confirmed`
  const cancelUrl   = `${SITE_URL}/confirm/${token}?status=cancelled`
  // Midi UTC pour éviter les décalages de fuseau (Montréal = UTC-4/5)
  const dateLabel   = new Date(date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabelEn = new Date(date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'long' })
  const contact     = contactName ? `${esc(contactName)}${contactPhone ? ` · ${esc(contactPhone)}` : ''}` : null

  const sep = `<hr style="border:none;border-top:2px solid #e2e2e2;margin:40px 0;">`

  // Remerciement post-session
  if (type === 'merci') {
    return {
      subject: `Thank you / Merci — ${esc(project)}`,
      html: `<p>Hi ${esc(prenom)},</p>
<p>Thank you so much for being part of <strong>${esc(project)}</strong>! It was a genuine pleasure working with you. We'll share the results as soon as they're ready.</p>
<p>We hope to work with you again soon!</p>
${sep}
<p>Bonjour ${esc(prenom)},</p>
<p>Merci beaucoup d'avoir participé à <strong>${esc(project)}</strong> ! Ce fut un vrai plaisir de travailler avec vous. Nous partagerons les résultats dès qu'ils seront prêts.</p>
<p>Au plaisir de vous revoir très bientôt !</p>`,
    }
  }

  // Confirmation de paiement envoyé
  if (type === 'paiement') {
    const payDetails = [compensationAmount, compensationMethod, compensationDelay].filter(Boolean).join(' · ')
    return {
      subject: `Payment sent / Paiement envoyé — ${esc(project)}`,
      html: `<p>Hi ${esc(prenom)},</p>
<p>Your payment for <strong>${esc(project)}</strong> has been sent.${payDetails ? ` <strong>${esc(payDetails)}</strong>` : ''}</p>
<p>Thank you again for your participation!</p>
${sep}
<p>Bonjour ${esc(prenom)},</p>
<p>Votre paiement pour <strong>${esc(project)}</strong> a été envoyé.${payDetails ? ` <strong>${esc(payDetails)}</strong>` : ''}</p>
<p>Merci encore pour votre participation !</p>`,
    }
  }

  // J-1 et morning = récapitulatif pour les confirmés (pas de CTA confirmation)
  if (type === 'j1' || type === 'morning') {
    const subjectEn = type === 'morning' ? `See you today — ${esc(project)}` : `See you tomorrow — ${esc(project)}`
    const subjectFr = type === 'morning' ? `À tout à l'heure — ${esc(project)}` : `À demain — ${esc(project)} · Récapitulatif`
    return {
      subject: `${subjectEn} / ${subjectFr}`,
      html: `<p>Hi ${esc(prenom)},</p>
<p>${type === 'morning' ? "We're expecting you today!" : "Your shoot is tomorrow —"} here's everything you need to know:</p>
<ul>
  <li><strong>Date:</strong> ${esc(dateLabelEn)}</li>
  <li><strong>Location:</strong> ${esc(address)}</li>
  ${callTime ? `<li><strong>Your call time:</strong> ${esc(callTime)}</li>` : ''}
  ${contact  ? `<li><strong>On-site contact:</strong> ${esc(contact)}</li>` : ''}
</ul>
<p>See you soon!</p>
${sep}
<p>Bonjour ${esc(prenom)},</p>
<p>${type === 'morning' ? "On vous attend aujourd'hui !" : 'Votre shoot est demain —'} voici tout ce qu'il faut savoir :</p>
<ul>
  <li><strong>Date :</strong> ${esc(dateLabel)}</li>
  <li><strong>Lieu :</strong> ${esc(address)}</li>
  ${callTime ? `<li><strong>Votre call time :</strong> ${esc(callTime)}</li>` : ''}
  ${contact  ? `<li><strong>Contact sur place :</strong> ${esc(contact)}</li>` : ''}
</ul>
<p>À très bientôt !</p>`,
    }
  }

  // J-5 et J-2 = relance aux non-répondants (pending)
  return {
    subject: `Reminder: confirm your attendance / Rappel : confirmez votre participation — ${esc(project)}`,
    html: `<p>Hi ${esc(prenom)},</p>
<p>We haven't received your confirmation for the shoot <strong>${esc(project)}</strong> on <strong>${esc(dateLabelEn)}</strong>.</p>
<p>Could you confirm your attendance?</p>
<p>
  <a href="${confirmUrl}" style="display:inline-block;background:#8B0020;color:#fff;padding:10px 20px;margin-right:8px;font-weight:700;text-decoration:none;">✓ I confirm</a>
  <a href="${cancelUrl}" style="display:inline-block;background:#fff;color:#6b6b6b;padding:10px 20px;border:1px solid #e0e0e0;text-decoration:none;">I cannot attend</a>
</p>
${sep}
<p>Bonjour ${esc(prenom)},</p>
<p>Nous n'avons pas encore reçu votre confirmation pour le shoot <strong>${esc(project)}</strong> le <strong>${esc(dateLabel)}</strong>.</p>
<p>Pouvez-vous nous confirmer votre présence ?</p>
<p>
  <a href="${confirmUrl}" style="display:inline-block;background:#8B0020;color:#fff;padding:10px 20px;margin-right:8px;font-weight:700;text-decoration:none;">✓ Je confirme</a>
  <a href="${cancelUrl}" style="display:inline-block;background:#fff;color:#6b6b6b;padding:10px 20px;border:1px solid #e0e0e0;text-decoration:none;">Je ne peux pas venir</a>
</p>`,
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { sessionId, type }: { sessionId: string; type: ReminderType } = await request.json()
  if (!sessionId || !['j5', 'j2', 'j1', 'morning', 'merci', 'paiement'].includes(type)) {
    return NextResponse.json({ success: false, message: 'Paramètres invalides.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
  }

  const sentField = sentAtField(type)

  // 1. Récupérer la session (projet, date, adresse, contact)
  const sRes = await fetch(
    `${url}/rest/v1/sessions?id=eq.${encodeURIComponent(sessionId)}&select=project,date,address,contact_name,contact_phone,compensation_json&limit=1`,
    { headers }
  )
  if (!sRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  const [session] = await sRes.json() as Array<{
    project:           string
    date:              string
    address:           string
    contact_name:      string | null
    contact_phone:     string | null
    compensation_json: { type: string; amount: string | null; payment_method: string | null; delay: string | null } | null
  }>
  if (!session) return NextResponse.json({ success: false }, { status: 404 })

  // 2. Récupérer les modèles cibles — filtre sur statut ET champ sent_at null (anti-doublon)
  // J-1 et morning → seulement les confirmés (récapitulatif)
  // J-5 et J-2     → seulement les pending (relance non-répondants)
  const targetStatus = (type === 'j1' || type === 'morning' || type === 'merci' || type === 'paiement') ? 'confirmed' : 'pending'
  const mRes = await fetch(
    `${url}/rest/v1/session_models?session_id=eq.${encodeURIComponent(sessionId)}&status=eq.${targetStatus}&${sentField}=is.null&select=id,model_prenom,model_email,token,group:session_groups(call_time)`,
    { headers }
  )
  if (!mRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const models = await mRes.json() as Array<{
    id:          string
    model_prenom: string
    model_email:  string
    token:        string
    group:        { call_time: string } | null
  }>

  if (!models.length) return NextResponse.json({ success: true, sent: 0, skipped: 0 })

  // 3. Envoyer les rappels en parallèle — chaque email est indépendant
  const results = await Promise.allSettled(
    models.map(async m => {
      const comp = session.compensation_json
      const { subject, html } = buildReminderHtml(type, {
        prenom:              m.model_prenom,
        project:             session.project,
        date:                session.date,
        address:             session.address,
        callTime:            m.group?.call_time ?? null,
        contactName:         session.contact_name,
        contactPhone:        session.contact_phone,
        token:               m.token,
        compensationAmount:  comp?.amount ?? null,
        compensationMethod:  comp?.payment_method ?? null,
        compensationDelay:   comp?.delay ?? null,
      })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from: 'Lumina Photography <casting@luminamodels.ca>',
          to:   [m.model_email],
          subject,
          html,
        }),
      })
      if (!res.ok) throw new Error(`Resend ${res.status}`)

      // Marquer comme envoyé — évite les doublons si le bouton est re-cliqué.
      // On throw si le PATCH échoue : sans ce marqueur, l'anti-doublon ne fonctionne plus
      // et Promise.allSettled comptera ce rappel comme rejected (visible dans les stats).
      const pRes = await fetch(
        `${url}/rest/v1/session_models?id=eq.${encodeURIComponent(m.id)}`,
        {
          method:  'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ [sentField]: new Date().toISOString() }),
        }
      )
      if (!pRes.ok) throw new Error(`PATCH sent_at failed: ${pRes.status}`)
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ success: true, sent, failed })
}
