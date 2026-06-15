import { NextResponse } from 'next/server'

/* ── Supabase migration requise pour les nouveaux champs ────────────
   ALTER TABLE candidatures
     ADD COLUMN IF NOT EXISTS ville             text,
     ADD COLUMN IF NOT EXISTS pays              text,
     ADD COLUMN IF NOT EXISTS poids             numeric,
     ADD COLUMN IF NOT EXISTS longueur_cheveux  text,
     ADD COLUMN IF NOT EXISTS couleur_yeux      text,
     ADD COLUMN IF NOT EXISTS couleur_cheveux   text,
     ADD COLUMN IF NOT EXISTS date_naissance    date,
     ADD COLUMN IF NOT EXISTS langues           text,
     ADD COLUMN IF NOT EXISTS aspect            text;
──────────────────────────────────────────────────────────────────── */

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024
const RATE_LIMIT_MS   = 60_000

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
      'Content-Type':  'image/jpeg',
    },
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
          <p style="color: #6b6b6b; margin-bottom: 32px;">Agence de casting international</p>
          <p>Bonjour <strong>${data.prenom}</strong>,</p>
          <p>Ta candidature a bien été enregistrée. Nous te contacterons dès qu'un projet correspondant à ton profil se présente.</p>
          <p style="color: #6b6b6b; font-size: 0.9rem; margin-top: 32px;">L'équipe Lumina Photography</p>
        </div>
      `,
    }),
  })

  /* Email admin — tableau complet pour le matching projet */
  const toAdmin = fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Lumina Photography <casting@luminamodels.ca>',
      to:      ['luminaphotography.mtl@gmail.com'],
      subject: `Nouveau modèle — ${data.prenom} ${data.nom}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #0a0a0a;">
          <h2 style="font-weight: 300;">Nouveau modèle inscrit</h2>
          <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr><td style="padding:6px 0;color:#6b6b6b;width:160px">Nom</td><td><strong>${data.prenom} ${data.nom}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Email</td><td>${data.email}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Téléphone</td><td>${data.telephone}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Genre</td><td>${data.genre}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Taille</td><td>${data.taille} cm</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Mensurations</td><td>${data.poitrine}-${data.tailleMes}-${data.hanches} cm</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Pointure EU</td><td>${data.pointure || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Yeux</td><td>${data.yeux || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Cheveux</td><td>${data.longueurCheveux || ''} ${data.cheveux || ''}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Ville / Pays</td><td>${data.ville}${data.pays ? ', ' + data.pays : ''}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Naissance</td><td>${data.dateNaissance || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Disponibilité</td><td>${data.disponibilite || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Langues</td><td>${data.langues || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Aspect</td><td>${data.aspect || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Expérience</td><td>${data.experience || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b6b6b">Instagram</td><td>${data.instagram ? '@' + data.instagram : '—'}</td></tr>
          </table>
          <p style="margin-top:24px;">
            <a href="https://luminamodels.ca/admin/dashboard"
               style="background:#8B0020;color:#fff;padding:12px 24px;text-decoration:none;font-size:0.8rem;letter-spacing:0.1em;">
              Voir le dashboard →
            </a>
          </p>
        </div>
      `,
    }),
  })

  await Promise.all([toCandidate, toAdmin])
}

export const maxDuration = 60

export async function POST(request: Request) {
  const data = await request.json()

  /* ── 1. HONEYPOT ── */
  if (data.website) return NextResponse.json({ success: true })

  /* ── 2. RATE LIMIT ── */
  const ip      = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const now     = Date.now()
  const lastTime = lastSubmitByIp.get(ip) ?? 0

  if (now - lastTime < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastTime)) / 1000)
    return NextResponse.json(
      { success: false, message: `Merci de patienter encore ${waitSec} secondes.` },
      { status: 429 }
    )
  }
  lastSubmitByIp.set(ip, now)

  /* ── 3. RECAPTCHA v3 — seulement si la clé est configurée (dev: skippé) ── */
  if (process.env.RECAPTCHA_SECRET_KEY && data.recaptchaToken) {
    const secret    = process.env.RECAPTCHA_SECRET_KEY
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${data.recaptchaToken}`
    const rcRes     = await fetch(verifyUrl, { method: 'POST' })
    const rcJson    = await rcRes.json()

    if (!rcJson.success || rcJson.score < 0.5) {
      return NextResponse.json(
        { success: false, message: 'Vérification anti-bot échouée. Réessaie dans quelques instants.' },
        { status: 403 }
      )
    }
  }

  /* ── 4. VALIDATION PHOTOS ── */
  try {
    const profilSize = getBase64Size(data.photoProfil)
    const bodySize   = getBase64Size(data.photoBody)

    if (profilSize > MAX_PHOTO_BYTES || bodySize > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { success: false, message: "Une photo dépasse la limite de 1,5 Mo. Compresse-la avant d'envoyer." },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ success: false, message: 'Format de photo invalide.' }, { status: 400 })
  }

  /* ── 5. UPLOAD PHOTOS ── */
  let profilPath: string, bodyPath: string
  try {
    const timestamp = Date.now()
    const baseName  = data.email.replace(/[@.]/g, '_') + '_' + timestamp;
    [profilPath, bodyPath] = await Promise.all([
      uploadPhoto(base64ToBuffer(data.photoProfil), `${baseName}_profil.jpg`),
      uploadPhoto(base64ToBuffer(data.photoBody),   `${baseName}_body.jpg`),
    ])
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { success: false, message: "Erreur lors de l'envoi des photos. Réessaie dans quelques instants." },
      { status: 500 }
    )
  }

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
      /* Identité */
      prenom:     data.prenom,
      nom:        data.nom,
      email:      data.email,
      telephone:  data.telephone,
      instagram:  data.instagram     || null,
      genre:      data.genre         || null,
      /* Physique */
      taille:     data.taille        ? parseInt(data.taille)     : null,
      poitrine:   data.poitrine      ? parseInt(data.poitrine)   : null,
      tour_taille: data.tailleMes    ? parseInt(data.tailleMes)  : null,
      hanches:    data.hanches       ? parseInt(data.hanches)    : null,
      poids:      data.poids         ? parseFloat(data.poids)    : null,
      pointure:   data.pointure      ? parseInt(data.pointure)   : null,
      taille_haut: data.tailleHaut   || null,
      taille_bas:  data.tailleBas    || null,
      /* Apparence */
      teint:            data.teint           || null,
      couleur_yeux:     data.yeux            || null,
      longueur_cheveux: data.longueurCheveux || null,
      couleur_cheveux:  data.cheveux         || null,
      aspect:           data.aspect          || null,
      /* Localisation */
      ville: data.ville || null,
      pays:  data.pays  || null,
      /* Casting */
      experience:      data.experience    || null,
      date_naissance:  data.dateNaissance || null,
      disponibilite:   data.disponibilite || null,
      langues:         data.langues       || null,
      /* Photos */
      photo_profil_url: profilPath,
      photo_body_url:   bodyPath,
    }),
  })

  if (!dbRes.ok) {
    const errText = await dbRes.text()
    console.error('DB error:', dbRes.status, errText)
    return NextResponse.json(
      { success: false, message: 'Erreur base de données. Réessaie dans quelques instants.' },
      { status: 500 }
    )
  }

  sendConfirmationEmails(data).catch(err => console.error('Email error:', err))
  return NextResponse.json({ success: true })
}
