// Développement uniquement — rend l'HTML email directement dans le navigateur.
// Usage : GET /api/dev/email-preview?type=remind&variant=j5
// Types  : send-session | remind | confirm | select
// Variants (remind) : j5 | j2 | j1 | morning | merci | paiement
import { NextRequest, NextResponse } from 'next/server'
import { buildEmailWrapper, buildCtaButtons, buildInfoBlock, esc } from '@/lib/email'

const PREVIEW_DATA = {
  prenom:    'Amélie',
  project:   'Lumina Été 2026',
  date:      '15 juillet 2026',
  address:   '2165 Avenue Charlemagne, Montréal, QC',
  callTime:  '09h30',
  confirmUrl: '#confirm',
  cancelUrl:  '#cancel',
  factureUrl: '#facture',
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not found', { status: 404 })
  }

  const { searchParams } = request.nextUrl
  const type    = searchParams.get('type')    ?? 'remind'
  const variant = searchParams.get('variant') ?? 'j5'
  const { prenom, project, date, address, callTime, confirmUrl, cancelUrl, factureUrl } = PREVIEW_DATA

  let html = ''

  if (type === 'remind') {
    if (variant === 'j5' || variant === 'j2') {
      html = buildEmailWrapper({
        projectName: project,
        subLabel: `Rappel · ${date}`,
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)}, we haven't received your confirmation yet for <strong>${esc(project)}</strong>.</p>
${buildCtaButtons({ primaryLabel: '✓ I confirm', primaryUrl: confirmUrl, secondaryLabel: 'I cannot attend', secondaryUrl: cancelUrl })}`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, nous n'avons pas encore reçu votre confirmation pour <strong>${esc(project)}</strong>.</p>
${buildCtaButtons({ primaryLabel: '✓ Je confirme', primaryUrl: confirmUrl, secondaryLabel: 'Je ne peux pas venir', secondaryUrl: cancelUrl })}`,
      })
    } else if (variant === 'paiement') {
      html = buildEmailWrapper({
        projectName: project,
        subLabel: 'Paiement · Payment',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)}, your payment for <strong>${esc(project)}</strong> has been sent. <strong>500 CAD · Virement · 30 jours</strong></p>
${buildCtaButtons({ primaryLabel: 'Generate my invoice', primaryUrl: factureUrl })}`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, votre paiement pour <strong>${esc(project)}</strong> a été envoyé. <strong>500 CAD · Virement · 30 jours</strong></p>
${buildCtaButtons({ primaryLabel: 'Générer ma facture', primaryUrl: factureUrl })}`,
      })
    } else if (variant === 'merci') {
      html = buildEmailWrapper({
        projectName: project,
        subLabel: 'Remerciement · Thank you',
        bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)}, thank you so much for being part of <strong>${esc(project)}</strong>! It was a genuine pleasure working with you.</p>`,
        bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, merci beaucoup d'avoir participé à <strong>${esc(project)}</strong> ! Ce fut un vrai plaisir de travailler avec vous.</p>`,
      })
    } else {
      // j1 / morning
      html = buildEmailWrapper({
        projectName: project,
        subLabel: date,
        bodyEn: `<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi ${esc(prenom)}, your shoot is ${variant === 'morning' ? 'today' : 'tomorrow'}!</p>
<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Date:</strong> ${esc(date)}</p>
<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Location:</strong> ${esc(address)}</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Your call time:</strong> <span style="color:#8B0020;font-weight:700;">${esc(callTime)}</span></p>`,
        bodyFr: `<p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, votre shoot est ${variant === 'morning' ? "aujourd'hui" : 'demain'} !</p>
<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Date :</strong> ${esc(date)}</p>
<p style="margin:0 0 12px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Lieu :</strong> ${esc(address)}</p>
<p style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Votre call time :</strong> <span style="color:#8B0020;font-weight:700;">${esc(callTime)}</span></p>`,
      })
    }
  } else if (type === 'confirm') {
    html = buildEmailWrapper({
      projectName: project,
      subLabel: 'Participation confirmée · Confirmed',
      bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Dear ${esc(prenom)}, your participation has been confirmed.</p>
${buildInfoBlock('Date', esc(date))}
${buildInfoBlock('Location', esc(address))}
${buildInfoBlock('Your Call Time', `<span style="font-size:20px;font-weight:700;color:#8B0020;">${esc(callTime)}</span>`)}`,
      bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)}, votre participation a été confirmée.</p>
${buildInfoBlock('Date', esc(date))}
${buildInfoBlock('Lieu', esc(address))}
${buildInfoBlock('Votre Call Time', `<span style="font-size:20px;font-weight:700;color:#8B0020;">${esc(callTime)}</span>`)}`,
    })
  } else if (type === 'select') {
    html = buildEmailWrapper({
      projectName: 'Félicitations',
      subLabel: 'Tu as été sélectionné·e · You have been selected',
      bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour <strong>${esc(prenom)}</strong>,</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Ton profil a été <strong>sélectionné</strong> pour un projet Flawa Models. Merci de répondre à cet email pour confirmer ta disponibilité.</p>`,
      bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Hi <strong>${esc(prenom)}</strong>,</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Your profile has been <strong>selected</strong> for a Flawa Models project. Please reply to this email to confirm your availability.</p>`,
    })
  } else {
    // send-session
    html = buildEmailWrapper({
      projectName: project,
      subLabel: `Photoshoot · ${date}`,
      bodyEn: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Dear ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">We are pleased to confirm your participation in <strong>${esc(project)}</strong>, scheduled for <strong>${esc(date)}</strong>.</p>
${buildInfoBlock('Location', esc(address))}
${buildInfoBlock('Schedule')}
<p style="margin:0 0 8px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Group A</strong> — <span style="color:#8B0020;font-weight:700;">${esc(callTime)} (YOUR CALL TIME)</span></p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Group B</strong> — 13h00</p>
${buildCtaButtons({ primaryLabel: 'Confirm my attendance', primaryUrl: confirmUrl, secondaryLabel: 'Unable to attend', secondaryUrl: cancelUrl })}`,
      bodyFr: `<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
<p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous confirmons votre participation à <strong>${esc(project)}</strong>, prévu le <strong>${esc(date)}</strong>.</p>
${buildInfoBlock('Lieu', esc(address))}
${buildInfoBlock('Planning')}
<p style="margin:0 0 8px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Groupe A</strong> — <span style="color:#8B0020;font-weight:700;">${esc(callTime)} (VOTRE CALL TIME)</span></p>
<p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;"><strong>Groupe B</strong> — 13h00</p>
${buildCtaButtons({ primaryLabel: 'Confirmer ma présence', primaryUrl: confirmUrl, secondaryLabel: 'Je ne serai pas disponible', secondaryUrl: cancelUrl })}`,
    })
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
