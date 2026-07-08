// send-session POST — persiste la session en DB puis envoie les convocations.
// Auth via cookie httpOnly. Génère un token UUID par modèle (défaut DB) pour la confirmation.
// Utilise le REST API Supabase directement (pas de SDK côté client) pour rester cohérent
// avec le reste du projet qui n'installe pas @supabase/supabase-js.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SITE_URL } from '@/types/session'
import type { SessionForm, Group } from '@/types/candidature'
import { esc, buildCtaButtons, buildInfoBlock, buildEmailWrapper } from '@/lib/email'

// Le body reçu a assignedIds sérialisé en tableau (Set n'est pas JSON-sérialisable).
type SerializedGroup = Omit<Group, 'assignedIds'> & { assignedIds: string[] }
type SerializedSessionForm = Omit<SessionForm, 'groups'> & { groups: SerializedGroup[] }

interface SendBody {
  models: { email: string; prenom: string; nom?: string; langue?: string }[]
  session: SerializedSessionForm
}

function formatDate(iso: string, locale: 'fr-CA' | 'en-CA') {
  // Midi UTC pour éviter les décalages de fuseau horaire (ex. Montréal = UTC-4/5)
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.replace('h', ':').split(':').map(Number)
  const total = (h * 60) + (m || 0) + mins
  // % 24 pour gérer l'overflow minuit (ex: 23h45 + 30min → 00h15)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}h${String(total % 60).padStart(2, '0')}`
}

function cancelDeadlineDateLocale(date: string, days: number, locale: 'fr-CA' | 'en-CA'): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function buildEmail(params: {
  prenom: string
  session: SerializedSessionForm
  group: SerializedGroup | null
  token: string
  lang: string
}): string {
  const { prenom, session, group, token, lang } = params
  const confirmUrl = `${SITE_URL}/confirm/${token}?status=confirmed`
  const cancelUrl  = `${SITE_URL}/confirm/${token}?status=cancelled`
  const dateFr     = formatDate(session.date, 'fr-CA')
  const deadline   = cancelDeadlineDateLocale(session.date, session.cancel_deadline_days, 'fr-CA')

  // Mettre en évidence le groupe du modèle en rouge — chaque groupe a son call time distinct.
  const groupRowsFr = session.groups
    .filter(g => g.name || g.call_time)
    .map(g => {
      const isOwn = group ? g === group : false
      const end   = g.call_time && g.duration_min
        ? ` → ~${addMinutes(g.call_time, g.duration_min)}`
        : ''
      return `<tr><td style="padding:4px 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;${isOwn ? 'font-weight:700;color:#8B0020;' : ''}">
        <strong>${esc(g.name)}</strong> — ${esc(g.call_time)}${end}${isOwn ? ' ← <strong>Votre call time</strong>' : ''}
      </td></tr>`
    }).join('')

  const teamItems = [
    session.team.makeup  && '✓ Maquilleur·se présent·e',
    session.team.hair    && '✓ Coiffeur·se présent·e',
    session.team.stylist && '✓ Styliste présent·e',
  ].filter(Boolean)

  const teamFr = teamItems.length
    ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Équipe sur place :</strong><br>${teamItems.join('<br>')}</p>`
    : ''

  const prepFr = session.prep_notes
    ? `<p style="margin:16px 0 0;font-size:16px;background:#F7F3EE;padding:12px 16px;color:#0A0A0A;line-height:1.8;"><strong>Préparation :</strong><br>${esc(session.prep_notes)}</p>`
    : ''

  const lookFr = group?.look_brief
    ? `<p style="margin:16px 0 0;font-size:16px;background:#F7F3EE;padding:12px 16px;color:#0A0A0A;line-height:1.8;"><strong>Look demandé :</strong> ${esc(group.look_brief)}</p>`
    : ''

  const bringFr = group?.bring_items
    ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Apporter :</strong> ${esc(group.bring_items)}</p>`
    : ''

  const compensationFr = (() => {
    if (session.compensation_type === 'tfp')
      return '<p style="margin:16px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">Participation non rémunérée (TFP). Un contrat d\'autorisation de droits à l\'image vous sera remis.</p>'
    if (session.compensation_type === 'paid')
      return `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Cachet :</strong> ${esc(session.compensation_amount)}${session.compensation_method ? ` · ${esc(session.compensation_method)}` : ''}${session.compensation_delay ? ` · ${esc(session.compensation_delay)}` : ''}</p>`
    return `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Défraiement :</strong> ${esc(session.compensation_amount)} ${session.compensation_method} ${session.compensation_delay}</p>`
  })()

  const accessFr  = session.access_instructions
    ? `<p style="margin:6px 0 0;font-size:14px;color:#6B6B6B;line-height:1.8;">${esc(session.access_instructions)}</p>`
    : ''

  const contactFr = session.contact_name
    ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Contact sur place :</strong> ${esc(session.contact_name)}${session.contact_phone ? ` · <a href="tel:${esc(session.contact_phone)}" style="color:#8B0020;">${esc(session.contact_phone)}</a>` : ''}</p>`
    : ''

  const notesFr = session.notes_models
    ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;">${esc(session.notes_models)}</p>`
    : ''

  const wappFr = session.whatsapp
    ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;">Groupe WhatsApp : <a href="${esc(session.whatsapp)}" style="color:#8B0020;">${esc(session.whatsapp)}</a></p>`
    : ''

  const moodFr = session.moodboard_url
    ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;">Moodboard : <a href="${esc(session.moodboard_url)}" style="color:#8B0020;">Voir le moodboard →</a></p>`
    : ''

  const typeLabel = { photo: 'photoshoot', video: 'tournage vidéo', hybrid: 'session photo & vidéo' }[session.type]

  // Section EN — toujours construite, EN en premier dans l'email bilingue
  let sectionEn = ''
  {
    const typeLabelEn = { photo: 'photoshoot', video: 'video shoot', hybrid: 'photo & video session' }[session.type]
    const dateEn       = formatDate(session.date, 'en-CA')
    const deadlineEn   = cancelDeadlineDateLocale(session.date, session.cancel_deadline_days, 'en-CA')

    const groupRowsEn = session.groups
      .filter(g => g.name || g.call_time)
      .map(g => {
        const isOwn = group ? g === group : false
        const end   = g.call_time && g.duration_min
          ? ` → ~${addMinutes(g.call_time, g.duration_min)}`
          : ''
        return `<tr><td style="padding:4px 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;${isOwn ? 'font-weight:700;color:#8B0020;' : ''}">
          <strong>${esc(g.name)}</strong> — ${esc(g.call_time)}${end}${isOwn ? ' ← <strong>Your call time</strong>' : ''}
        </td></tr>`
      }).join('')

    const teamItemsEn = [
      session.team.makeup  && '✓ Makeup artist on set',
      session.team.hair    && '✓ Hairstylist on set',
      session.team.stylist && '✓ Stylist on set',
    ].filter(Boolean)

    const teamEn = teamItemsEn.length
      ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>On-set team:</strong><br>${teamItemsEn.join('<br>')}</p>`
      : ''

    const prepEn = session.prep_notes
      ? `<p style="margin:16px 0 0;font-size:16px;background:#F7F3EE;padding:12px 16px;color:#0A0A0A;line-height:1.8;"><strong>Preparation:</strong><br>${esc(session.prep_notes)}</p>`
      : ''

    const lookEn = group?.look_brief
      ? `<p style="margin:16px 0 0;font-size:16px;background:#F7F3EE;padding:12px 16px;color:#0A0A0A;line-height:1.8;"><strong>Requested look:</strong> ${esc(group.look_brief)}</p>`
      : ''

    const bringEn = group?.bring_items
      ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Please bring:</strong> ${esc(group.bring_items)}</p>`
      : ''

    const compensationEn = (() => {
      if (session.compensation_type === 'tfp')
        return '<p style="margin:16px 0 0;font-size:13px;color:#6B6B6B;line-height:1.8;">Unpaid participation (TFP). An image rights authorization contract will be provided.</p>'
      if (session.compensation_type === 'paid')
        return `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Rate:</strong> ${esc(session.compensation_amount)}${session.compensation_method ? ` · ${esc(session.compensation_method)}` : ''}${session.compensation_delay ? ` · ${esc(session.compensation_delay)}` : ''}</p>`
      return `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>Allowance:</strong> ${esc(session.compensation_amount)} ${session.compensation_method} ${session.compensation_delay}</p>`
    })()

    const accessEn = session.access_instructions
      ? `<p style="margin:6px 0 0;font-size:14px;color:#6B6B6B;line-height:1.8;">${esc(session.access_instructions)}</p>`
      : ''

    const contactEn = session.contact_name
      ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;"><strong>On-site contact:</strong> ${esc(session.contact_name)}${session.contact_phone ? ` · <a href="tel:${esc(session.contact_phone)}" style="color:#8B0020;">${esc(session.contact_phone)}</a>` : ''}</p>`
      : ''

    const notesEn = session.notes_models
      ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;">${esc(session.notes_models)}</p>`
      : ''

    const wappEn = session.whatsapp
      ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;">WhatsApp group: <a href="${esc(session.whatsapp)}" style="color:#8B0020;">${esc(session.whatsapp)}</a></p>`
      : ''

    const moodEn = session.moodboard_url
      ? `<p style="margin:16px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;">Moodboard: <a href="${esc(session.moodboard_url)}" style="color:#8B0020;">View moodboard →</a></p>`
      : ''

    sectionEn = `
      <p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Dear ${esc(prenom)},</p>
      <p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">
        We are pleased to confirm your participation in the ${esc(typeLabelEn)} <strong>${esc(session.project)}</strong>, scheduled for <strong>${esc(dateEn)}</strong>.
      </p>
      ${buildInfoBlock('Location', esc(session.address))}
      ${accessEn}
      ${buildInfoBlock('Schedule')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${groupRowsEn}</table>
      ${prepEn}${lookEn}${bringEn}${teamEn}${compensationEn}${contactEn}${notesEn}${moodEn}${wappEn}
      <p style="margin:24px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Kindly confirm your attendance no later than <strong>${esc(deadlineEn)}</strong>:</p>
      ${buildCtaButtons({ primaryLabel: 'Confirm my attendance', primaryUrl: confirmUrl, secondaryLabel: 'Unable to attend', secondaryUrl: cancelUrl })}
      <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;font-family:Arial,sans-serif;">We look forward to seeing you.</p>`
  }

  const bodyFr = `
      <p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Bonjour ${esc(prenom)},</p>
      <p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">
        Nous avons le plaisir de confirmer votre participation au ${esc(typeLabel)} <strong>${esc(session.project)}</strong>, prévu le <strong>${esc(dateFr)}</strong>.
      </p>
      ${buildInfoBlock('Lieu', esc(session.address))}
      ${accessFr}
      ${buildInfoBlock('Planning')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${groupRowsFr}</table>
      ${prepFr}${lookFr}${bringFr}${teamFr}${compensationFr}${contactFr}${notesFr}${moodFr}${wappFr}
      <p style="margin:24px 0 0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">Nous vous remercions de confirmer votre disponibilité au plus tard le <strong>${esc(deadline)}</strong> :</p>
      ${buildCtaButtons({ primaryLabel: 'Confirmer ma présence', primaryUrl: confirmUrl, secondaryLabel: 'Je ne serai pas disponible', secondaryUrl: cancelUrl })}
      <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.8;font-family:Arial,sans-serif;">Nous nous réjouissons de vous retrouver.</p>`

  return buildEmailWrapper({
    projectName: session.project,
    subLabel:    `${typeLabel} · ${dateFr}`,
    bodyEn:      sectionEn,
    bodyFr,
  })
}

export async function POST(request: NextRequest) {
  const token = await verifyToken(request)
  if (!token) return NextResponse.json({ success: false }, { status: 401 })

  const body: SendBody = await request.json()
  const { models, session } = body

  // Validation — rejetée avant toute écriture en DB
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalid =
    !Array.isArray(models) || models.length === 0 ||
    !session?.project?.trim() ||
    !ISO_DATE.test(session?.date ?? '') ||
    !session?.address?.trim() ||
    !['photo', 'video', 'hybrid'].includes(session?.type) ||
    !['tfp', 'paid', 'expenses'].includes(session?.compensation_type) ||
    typeof session?.cancel_deadline_days !== 'number' || session.cancel_deadline_days < 0 ||
    models.some(m => !EMAIL_RE.test(m?.email ?? '') || !m?.prenom?.trim())

  if (invalid) {
    return NextResponse.json({ success: false, message: 'Données invalides ou manquantes.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const headers = {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
    // Prefer: return=representation → retourne la ligne insérée avec son id généré
    'Prefer':        'return=representation',
  }

  // 1. Persister la session — statut "sent" dès l'envoi, pas "draft"
  const sRes = await fetch(`${url}/rest/v1/sessions`, {
    method:  'POST',
    headers,
    body: JSON.stringify({
      project:              session.project,
      type:                 session.type,
      date:                 session.date,
      address:              session.address,
      access_instructions:  session.access_instructions || null,
      contact_name:         session.contact_name || null,
      contact_phone:        session.contact_phone || null,
      prep_notes:           session.prep_notes || null,
      team_json:            session.team,
      compensation_json: {
        type:           session.compensation_type,
        amount:         session.compensation_amount || null,
        payment_method: session.compensation_method || null,
        delay:          session.compensation_delay || null,
      },
      cancel_deadline_days: session.cancel_deadline_days,
      max_models:           session.max_models ?? null,
      notes_internal:       session.notes_internal || null,
      notes_models:         session.notes_models || null,
      moodboard_url:        session.moodboard_url || null,
      whatsapp:             session.whatsapp || null,
      status:               'sent',
    }),
  })

  if (!sRes.ok) {
    return NextResponse.json({ success: false, message: 'Erreur DB sessions.' }, { status: 500 })
  }

  const [sessionRow] = await sRes.json() as Array<{ id: string }>
  if (!sessionRow?.id) {
    return NextResponse.json({ success: false, message: 'Erreur DB sessions (id manquant).' }, { status: 500 })
  }

  // 2. Persister les groupes et conserver leur DB id pour le lien session_models → group
  const groupRows = await Promise.all(
    session.groups.map(async (g, i) => {
      const gRes = await fetch(`${url}/rest/v1/session_groups`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          session_id:   sessionRow.id,
          name:         g.name,
          call_time:    g.call_time,
          duration_min: g.duration_min,
          look_brief:   g.look_brief || null,
          bring_items:  g.bring_items || null,
          sort_order:   i,
        }),
      })
      if (!gRes.ok) return null
      const [row] = await gRes.json() as Array<{ id: string; name: string }>
      // On reattache assignedIds (tableau) pour trouver le groupe de chaque modèle à l'étape 3
      return row ? { ...row, assignedIds: g.assignedIds } : null
    })
  )

  // Rollback complet si un groupe n'a pas pu être inséré — la session ne doit pas exister sans ses groupes
  if (groupRows.some(g => g === null)) {
    await fetch(`${url}/rest/v1/session_groups?session_id=eq.${sessionRow.id}`, { method: 'DELETE', headers })
    await fetch(`${url}/rest/v1/sessions?id=eq.${sessionRow.id}`, { method: 'DELETE', headers })
    return NextResponse.json({ success: false, message: 'Erreur DB session_groups — session annulée.' }, { status: 500 })
  }

  // 3. Pour chaque modèle : insérer session_models (token généré par défaut en DB) puis envoyer email
  const results = await Promise.allSettled(
    models.map(async (m) => {
      // Chercher le groupe explicitement assigné par email de candidature
      // assignedIds est un tableau ici (désérialisé depuis JSON) — utiliser includes(), pas has()
      const groupMatch = groupRows.find(g => g?.assignedIds?.includes(m.email)) ?? null

      const smRes = await fetch(`${url}/rest/v1/session_models?select=token`, {
        method:  'POST',
        // select=token dans l'URL est ignoré — le champ retourné dépend de Prefer: return=representation
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          session_id:   sessionRow.id,
          model_email:  m.email,
          model_prenom: m.prenom,
          model_nom:    m.nom ?? null,
          model_langue: m.langue ?? 'fr',
          group_id:     groupMatch?.id ?? null,
        }),
      })

      if (!smRes.ok) throw new Error('session_models insert failed')
      const [smRow] = await smRes.json() as Array<{ id: string; token: string }>
      if (!smRow?.token) throw new Error('session_models: token manquant')

      // Retrouver le groupe d'origine (SerializedGroup) pour injecter look_brief / bring_items dans l'email
      const group = session.groups.find(g => g.assignedIds?.includes(m.email)) ?? null
      const html  = buildEmail({ prenom: m.prenom, session, group, token: smRow.token, lang: m.langue ?? 'fr' })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:     'Flawa Models <casting@luminamodels.ca>',
          reply_to: 'vidaflorita@gmail.com',
          to:       [m.email],
          subject:  `${session.project} — Convocation / Call sheet`,
          html,
        }),
      })
      if (!res.ok) throw new Error(`Resend error ${res.status}`)
      // Stocker le Resend email ID pour lier les webhooks (livraison, clic, bounce) à ce modèle
      const { id: resendId } = await res.json() as { id: string }
      if (resendId) {
        await fetch(`${url}/rest/v1/session_models?id=eq.${encodeURIComponent(smRow.id)}`, {
          method:  'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ resend_email_id: resendId }),
        })
      }
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ success: true, sessionId: sessionRow.id, sent, failed })
}
