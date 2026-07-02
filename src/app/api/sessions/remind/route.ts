// remind POST — envoie les rappels de confirmation aux modèles non-répondants.
// Appelé manuellement depuis le dashboard (bouton "Relancer").
// Évite les doublons via les champs reminder_*_sent_at.
// Utilise le REST API Supabase directement (pas de SDK) — cohérent avec les autres routes.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SITE_URL } from '@/types/session'
import { esc, buildCtaButtons, buildEmailWrapper } from '@/lib/email'

type ReminderType = 'j5' | 'j2' | 'j1' | 'morning' | 'merci' | 'paiement'

export function sentAtField(type: ReminderType): string {
  return {
    j5:       'reminder_j5_sent_at',
    j2:       'reminder_j2_sent_at',
    j1:       'reminder_j1_sent_at',
    morning:  'reminder_morning_sent_at',
    merci:    'reminder_merci_sent_at',
    paiement: 'reminder_paiement_sent_at',
  }[type]
}

export function buildReminderHtml(type: ReminderType, params: {
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

  // Remerciement post-session
  if (type === 'merci') {
    return {
      subject: `Thank you / Merci — ${esc(project)}`,
      html: buildEmailWrapper({
        projectName: project,
        subLabel:    'Remerciement · Thank you',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Thank you so much for being part of <strong>${esc(project)}</strong>! It was a genuine pleasure working with you. We'll share the results as soon as they're ready.</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We hope to work with you again soon!</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Merci beaucoup d'avoir participé à <strong>${esc(project)}</strong> ! Ce fut un vrai plaisir de travailler avec vous. Nous partagerons les résultats dès qu'ils seront prêts.</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Au plaisir de vous revoir très bientôt !</p>`,
      }),
    }
  }

  // Confirmation de paiement envoyé
  if (type === 'paiement') {
    const payDetails  = [compensationAmount, compensationMethod, compensationDelay].filter(Boolean).join(' · ')
    const factureLink = `${SITE_URL}/facture/${token}`
    return {
      subject: `Payment sent / Paiement envoyé — ${esc(project)}`,
      html: buildEmailWrapper({
        projectName: project,
        subLabel:    'Paiement · Payment',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Your payment for <strong>${esc(project)}</strong> has been sent.${payDetails ? ` <strong>${esc(payDetails)}</strong>` : ''}</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Please use the link below to generate your invoice and return it to us at luminaphotography.mtl@gmail.com:</p>
${buildCtaButtons({ primaryLabel: 'Generate my invoice', primaryUrl: factureLink })}
<p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;">Thank you again for your participation!</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Votre paiement pour <strong>${esc(project)}</strong> a été envoyé.${payDetails ? ` <strong>${esc(payDetails)}</strong>` : ''}</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Veuillez utiliser le lien ci-dessous pour générer votre facture et nous la retourner à luminaphotography.mtl@gmail.com :</p>
${buildCtaButtons({ primaryLabel: 'Générer ma facture', primaryUrl: factureLink })}
<p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;">Merci encore pour votre participation !</p>`,
      }),
    }
  }

  // J-1 et morning = récapitulatif pour les confirmés (pas de CTA confirmation)
  if (type === 'j1' || type === 'morning') {
    const subjectEn  = type === 'morning' ? `See you today — ${esc(project)}` : `See you tomorrow — ${esc(project)}`
    const subjectFr  = type === 'morning' ? `À tout à l'heure — ${esc(project)}` : `À demain — ${esc(project)}`
    const introEn    = type === 'morning' ? "We're expecting you today!" : "Your shoot is tomorrow —"
    const introFr    = type === 'morning' ? "On vous attend aujourd'hui !" : 'Votre shoot est demain —'
    const detailsEn  = [
      `<strong>Date:</strong> ${esc(dateLabelEn)}`,
      `<strong>Location:</strong> ${esc(address)}`,
      callTime ? `<strong>Your call time:</strong> <span style="color:#8B0020;font-weight:700;">${esc(callTime)}</span>` : '',
      contact  ? `<strong>On-site contact:</strong> ${esc(contact)}` : '',
    ].filter(Boolean).map(d => `<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">${d}</p>`).join('')
    const detailsFr  = [
      `<strong>Date :</strong> ${esc(dateLabel)}`,
      `<strong>Lieu :</strong> ${esc(address)}`,
      callTime ? `<strong>Votre call time :</strong> <span style="color:#8B0020;font-weight:700;">${esc(callTime)}</span>` : '',
      contact  ? `<strong>Contact sur place :</strong> ${esc(contact)}` : '',
    ].filter(Boolean).map(d => `<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">${d}</p>`).join('')
    return {
      subject: `${subjectEn} / ${subjectFr}`,
      html: buildEmailWrapper({
        projectName: project,
        subLabel:    `${esc(dateLabelEn)}`,
        bodyEn: `<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)}, ${introEn} here's everything you need:</p>${detailsEn}<p style="margin:12px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">See you soon!</p>`,
        bodyFr: `<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, ${introFr} voici tout ce qu'il faut savoir :</p>${detailsFr}<p style="margin:12px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">À très bientôt !</p>`,
      }),
    }
  }

  // J-5 et J-2 = relance aux non-répondants (pending)
  return {
    subject: `Reminder: confirm your attendance / Rappel : confirmez votre participation — ${esc(project)}`,
    html: buildEmailWrapper({
      projectName: project,
      subLabel:    `Rappel · ${esc(dateLabelEn)}`,
      bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)},</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We haven't received your confirmation for <strong>${esc(project)}</strong> on <strong>${esc(dateLabelEn)}</strong>. Could you confirm your attendance?</p>
${buildCtaButtons({ primaryLabel: '✓ I confirm', primaryUrl: confirmUrl, secondaryLabel: 'I cannot attend', secondaryUrl: cancelUrl })}`,
      bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous n'avons pas encore reçu votre confirmation pour <strong>${esc(project)}</strong> le <strong>${esc(dateLabel)}</strong>. Pouvez-vous nous confirmer votre présence ?</p>
${buildCtaButtons({ primaryLabel: '✓ Je confirme', primaryUrl: confirmUrl, secondaryLabel: 'Je ne peux pas venir', secondaryUrl: cancelUrl })}`,
    }),
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
          from: 'Flawa Models <casting@luminamodels.ca>',
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
