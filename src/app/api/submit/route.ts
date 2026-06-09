import { NextResponse } from 'next/server'

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024
const RATE_LIMIT_MS  = 60_000

/* Map en mémoire — persiste entre requêtes sur la même instance, se réinitialise au cold start */
const lastSubmitByIp = new Map<string, number>()

function getBase64Size(base64Data: string): number {
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!matches) throw new Error('Format de photo invalide.')
  const base64Pure = matches[2]
  const padding    = (base64Pure.match(/=+$/) || [''])[0].length
  return Math.floor((base64Pure.length * 3) / 4) - padding
}

function base64ToBuffer(base64Data: string): Buffer {
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!matches) throw new Error('Format invalide')
  return Buffer.from(matches[2], 'base64')
}

async function uploadPhoto(buffer: Buffer, fileName: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(`${supabaseUrl}/storage/v1/object/photos-candidatures/${fileName}`, {
    method: 'POST',
    headers: {
      'apikey':        supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'image/jpeg',
    },
    /* new Uint8Array() convertit Buffer<ArrayBufferLike> → Uint8Array<ArrayBuffer>, compatible avec BodyInit */
    body: new Uint8Array(buffer),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upload photo: ${res.status} — ${err}`)
  }

  return `photos-candidatures/${fileName}`
}

async function sendConfirmationEmails(data: Record<string, string>) {
  const resendKey = process.env.RESEND_API_KEY!

  const toCandidate = fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:     'Lumina Photography <casting@luminamodels.ca>',
      reply_to: 'luminaphotography.mtl@gmail.com',
      to:       [data.email],
      subject:  'Inscription reçue — Lumina Photography',
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #0a0a0a;">
          <h1 style="font-weight: 300; font-size: 2rem; margin-bottom: 8px;">Lumina Photography</h1>
          <p style="color: #6b6b6b; margin-bottom: 32px;">Agence de mannequinat</p>
          <p>Bonjour <strong>${data.prenom}</strong>,</p>
          <p>Tu as bien été enregistré(e) dans notre base de modèles. Nous te contacterons dès qu'un projet correspondant à ton profil se présente.</p>
          <p style="color: #6b6b6b; font-size: 0.9rem; margin-top: 32px;">L'équipe Lumina Photography</p>
        </div>
      `,
    }),
  })

  const toAdmin = fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Lumina Photography <casting@luminamodels.ca>',
      to:      ['luminaphotography.mtl@gmail.com'],
      subject: `Nouveau modèle inscrit — ${data.prenom} ${data.nom}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #0a0a0a;">
          <h2 style="font-weight: 300;">Nouveau modèle inscrit</h2>
          <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr><td style="padding: 8px 0; color:#6b6b6b;">Nom</td><td><strong>${data.prenom} ${data.nom}</strong></td></tr>
            <tr><td style="padding: 8px 0; color:#6b6b6b;">Email</td><td>${data.email}</td></tr>
            <tr><td style="padding: 8px 0; color:#6b6b6b;">Téléphone</td><td>${data.telephone}</td></tr>
            <tr><td style="padding: 8px 0; color:#6b6b6b;">Genre</td><td>${data.genre}</td></tr>
            <tr><td style="padding: 8px 0; color:#6b6b6b;">Taille</td><td>${data.taille} cm</td></tr>
            <tr><td style="padding: 8px 0; color:#6b6b6b;">Expérience</td><td>${data.experience}</td></tr>
          </table>
          <p style="margin-top: 24px;"><a href="https://luminamodels.ca/admin/dashboard" style="background:#0a0a0a; color:#fff; padding: 12px 24px; text-decoration: none; font-size: 0.8rem; letter-spacing: 0.1em;">Voir le dashboard →</a></p>
        </div>
      `,
    }),
  })

  await Promise.all([toCandidate, toAdmin])
}

/* Limite de durée Vercel — 60s pour laisser le temps aux uploads */
export const maxDuration = 60

export async function POST(request: Request) {
  const data = await request.json()

  /* ── 1. HONEYPOT — réponse 200 silencieuse pour ne pas révéler le piège */
  if (data.website) {
    return NextResponse.json({ success: true })
  }

  /* ── 2. RATE LIMIT ── */
  const ip       = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const now      = Date.now()
  const lastTime = lastSubmitByIp.get(ip) ?? 0

  if (now - lastTime < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastTime)) / 1000)
    return NextResponse.json(
      { success: false, message: `Merci de patienter encore ${waitSec} secondes avant de soumettre.` },
      { status: 429 }
    )
  }

  lastSubmitByIp.set(ip, now)

  /* ── 3. RECAPTCHA v3 — seuil 0.5 */
  const secret     = process.env.RECAPTCHA_SECRET_KEY!
  const verifyUrl  = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${data.recaptchaToken}`
  const rcRes      = await fetch(verifyUrl, { method: 'POST' })
  const rcJson     = await rcRes.json()

  if (!rcJson.success || rcJson.score < 0.5) {
    return NextResponse.json(
      { success: false, message: 'Vérification anti-bot échouée. Réessaie dans quelques instants.' },
      { status: 403 }
    )
  }

  /* ── 4. VALIDATION TAILLE PHOTOS — max 1.5 Mo par photo */
  try {
    const profilSize = getBase64Size(data.photoProfil)
    const bodySize   = getBase64Size(data.photoBody)

    if (profilSize > MAX_PHOTO_BYTES || bodySize > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { success: false, message: "Une photo dépasse la limite de 1,5 Mo. Essaie de la compresser avant d'envoyer." },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ success: false, message: 'Format de photo invalide.' }, { status: 400 })
  }

  /* ── 5. UPLOAD PHOTOS ── */
  const timestamp = Date.now()
  const baseName  = data.email.replace(/[@.]/g, '_') + '_' + timestamp

  const profilBuffer = base64ToBuffer(data.photoProfil)
  const bodyBuffer   = base64ToBuffer(data.photoBody)

  const [profilPath, bodyPath] = await Promise.all([
    uploadPhoto(profilBuffer, `${baseName}_profil.jpg`),
    uploadPhoto(bodyBuffer,   `${baseName}_body.jpg`),
  ])

  /* ── 6. INSERT Supabase ── */
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

  const dbRes = await fetch(`${supabaseUrl}/rest/v1/candidatures`, {
    method: 'POST',
    headers: {
      'apikey':        supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      prenom:        data.prenom,
      nom:           data.nom,
      email:         data.email,
      telephone:     data.telephone,
      instagram:     data.instagram     || null,
      taille:        data.taille        ? parseInt(data.taille)     : null,
      genre:         data.genre         || null,
      poitrine:      data.poitrine      ? parseInt(data.poitrine)   : null,
      tour_taille:   data.tourTaille    ? parseInt(data.tourTaille) : null,
      hanches:       data.hanches       ? parseInt(data.hanches)    : null,
      pointure:      data.pointure      ? parseInt(data.pointure)   : null,
      taille_haut:   data.tailleHaut    || null,
      taille_bas:    data.tailleBas     || null,
      experience:    data.experience    || null,
      disponibilite: data.disponibilite || null,
      photo_profil_url: profilPath,
      photo_body_url:   bodyPath,
    }),
  })

  if (!dbRes.ok) {
    const errText = await dbRes.text()
    throw new Error(`Supabase: ${dbRes.status} — ${errText}`)
  }

  /* Emails de confirmation — non bloquant, erreurs logguées silencieusement */
  sendConfirmationEmails(data).catch(err => console.error('Email error:', err))

  return NextResponse.json({ success: true })
}
