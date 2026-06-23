# Section 1 — Sécurité : Cookies httpOnly

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer le stockage du token JWT dans `localStorage` par un cookie `httpOnly` invisible au JavaScript.

**Architecture:** Un utilitaire partagé `src/lib/auth.ts` lit le cookie sur chaque route protégée. `verify-otp` et `refresh` posent/renouvellent le cookie via `NextResponse.cookies`. Le client (login + dashboard) ne manipule plus aucun token.

**Tech Stack:** Next.js 15 App Router · `NextRequest` / `NextResponse` cookies API · TypeScript strict

## Global Constraints

- Cookie : `name=lumina_token`, `httpOnly=true`, `secure=true`, `sameSite=strict`, `maxAge=3600`, `path=/admin`
- Cookie refresh : `name=lumina_refresh`, `httpOnly=true`, `secure=true`, `sameSite=strict`, `maxAge=2592000` (30j), `path=/admin/api/refresh`
- Jamais de `localStorage.setItem/getItem('lumina_token')` ni `lumina_refresh` après ce plan
- Next.js 15 : lire les cookies via `request.cookies.get()` sur `NextRequest`, poser via `response.cookies.set()`
- Commits Conventional Commits, `git add` sélectif

---

### Task 1 : Utilitaire partagé `src/lib/auth.ts`

**Files:**
- Create: `src/lib/auth.ts`

**Interfaces:**
- Produces: `verifyToken(request: NextRequest): Promise<string | null>` — retourne l'`access_token` si valide, `null` sinon

- [ ] **Step 1 : Créer `src/lib/auth.ts`**

```typescript
// auth.ts — vérifie le cookie lumina_token sur chaque requête admin.
// Retourne l'access_token si valide, null si absent ou expiré.
// Utilisé par toutes les routes protégées : candidatures, select, send-session.
import type { NextRequest } from 'next/server'

export async function verifyToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('lumina_token')?.value
  if (!token) return null

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey':        process.env.SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${token}`,
    },
  })

  return userRes.ok ? token : null
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: utilitaire verifyToken — lit le cookie httpOnly"
```

---

### Task 2 : `api/verify-otp/route.ts` — poser le cookie à la connexion

**Files:**
- Modify: `src/app/api/verify-otp/route.ts`

**Interfaces:**
- Consumes: rien (entrée JSON `{ email, token }`)
- Produces: cookie `lumina_token` + cookie `lumina_refresh` · réponse `{ success: true }` sans token dans le body

- [ ] **Step 1 : Remplacer le fichier**

```typescript
// verify-otp — vérifie le code OTP Supabase et pose les cookies httpOnly.
// Le token ne transite jamais dans le body de réponse : invisible au JS client.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, token } = await request.json()

  if (!email || !token) {
    return NextResponse.json(
      { success: false, message: 'Email et code requis.' },
      { status: 400 }
    )
  }

  const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'apikey':       process.env.SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'email', email, token }),
  })

  if (!authRes.ok) {
    return NextResponse.json(
      { success: false, message: 'Code invalide ou expiré.' },
      { status: 401 }
    )
  }

  const { access_token, refresh_token } = await authRes.json()

  const response = NextResponse.json({ success: true })

  response.cookies.set('lumina_token', access_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   3600,
    path:     '/admin',
  })

  response.cookies.set('lumina_refresh', refresh_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   2592000,
    path:     '/api/refresh',
  })

  return response
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/api/verify-otp/route.ts
git commit -m "feat: verify-otp — cookie httpOnly au lieu de token dans le body"
```

---

### Task 3 : `api/refresh/route.ts` — renouveler le cookie

**Files:**
- Modify: `src/app/api/refresh/route.ts`

**Interfaces:**
- Consumes: cookie `lumina_refresh` (lu depuis `request.cookies`)
- Produces: nouveaux cookies `lumina_token` + `lumina_refresh` · `{ success: true }`

- [ ] **Step 1 : Remplacer le fichier**

```typescript
// refresh — renouvelle le token Supabase depuis le cookie lumina_refresh.
// Pose de nouveaux cookies httpOnly sans exposer les tokens au client JS.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('lumina_refresh')?.value
  if (!refreshToken) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const res = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'apikey':       process.env.SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  )

  if (!res.ok) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const { access_token, refresh_token } = await res.json()

  const response = NextResponse.json({ success: true })

  response.cookies.set('lumina_token', access_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   3600,
    path:     '/admin',
  })

  response.cookies.set('lumina_refresh', refresh_token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   2592000,
    path:     '/api/refresh',
  })

  return response
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/api/refresh/route.ts
git commit -m "feat: refresh — lit et pose les cookies httpOnly"
```

---

### Task 4 : Routes protégées — utiliser `verifyToken` partagé

**Files:**
- Modify: `src/app/api/candidatures/route.ts`
- Modify: `src/app/api/candidatures/[id]/route.ts`
- Modify: `src/app/api/select/route.ts`
- Modify: `src/app/api/send-session/route.ts`

**Interfaces:**
- Consumes: `verifyToken(request)` depuis `@/lib/auth`
- Produces: même comportement qu'avant, sans `verifyToken` inline

- [ ] **Step 1 : Modifier `src/app/api/candidatures/route.ts`**

Remplacer la fonction `verifyToken` inline et changer le type `Request` → `NextRequest` :

```typescript
// candidatures GET — liste toutes les candidatures avec photos signées.
// Auth via cookie httpOnly lu par verifyToken (src/lib/auth.ts).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = await verifyToken(request)
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Session expirée. Reconnecte-toi.' },
      { status: 401 }
    )
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const dbRes = await fetch(`${url}/rest/v1/candidatures?select=*&order=date_inscription.desc`, {
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
    },
  })

  if (!dbRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const candidatures = await dbRes.json()

  const paths: string[] = []
  candidatures.forEach((c: Record<string, string>) => {
    if (c.photo_profil_url) paths.push(c.photo_profil_url.replace('photos-candidatures/', ''))
    if (c.photo_body_url)   paths.push(c.photo_body_url.replace('photos-candidatures/', ''))
  })

  const signedMap: Record<string, string> = {}

  if (paths.length > 0) {
    const signRes = await fetch(`${url}/storage/v1/object/sign/photos-candidatures`, {
      method: 'POST',
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ paths, expiresIn: 86400 }),
    })

    const signData: Array<{ path: string; signedURL?: string }> = await signRes.json()
    signData.forEach(item => {
      if (item.signedURL) signedMap[item.path] = `${url}/storage/v1${item.signedURL}`
    })
  }

  const result = candidatures.map((c: Record<string, string | null>) => ({
    ...c,
    photo_profil_signed: c.photo_profil_url
      ? signedMap[c.photo_profil_url.replace('photos-candidatures/', '')] ?? null
      : null,
    photo_body_signed: c.photo_body_url
      ? signedMap[c.photo_body_url.replace('photos-candidatures/', '')] ?? null
      : null,
  }))

  return NextResponse.json({ success: true, data: result })
}
```

- [ ] **Step 2 : Modifier `src/app/api/candidatures/[id]/route.ts`**

```typescript
// candidatures/[id] — DELETE et PATCH sur une candidature individuelle.
// Auth via cookie httpOnly. UUID validé avant tout appel Supabase.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await verifyToken(request)
  if (!token) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ success: false }, { status: 400 })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const getRes = await fetch(
    `${url}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}&select=photo_profil_url,photo_body_url`,
    { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
  )
  const [record] = await getRes.json()

  if (record) {
    const paths = [record.photo_profil_url, record.photo_body_url]
      .filter(Boolean)
      .map((p: string) => p.replace('photos-candidatures/', ''))
    if (paths.length > 0) {
      await fetch(`${url}/storage/v1/object/photos-candidatures`, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
      }).catch(() => { /* storage cleanup best-effort */ })
    }
  }

  const delRes = await fetch(`${url}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'return=minimal' },
  })

  if (!delRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await verifyToken(request)
  if (!token) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ success: false }, { status: 400 })

  const url  = process.env.SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_KEY!
  const body = await request.json()

  if (typeof body.selectionne !== 'boolean') {
    return NextResponse.json({ success: false, message: 'Champ invalide.' }, { status: 400 })
  }

  const patchRes = await fetch(`${url}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({ selectionne: body.selectionne }),
  })

  if (!patchRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3 : Modifier `src/app/api/select/route.ts`**

Remplacer `verifyToken` inline et `Request` → `NextRequest` :

```typescript
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
      from:     'Lumina Photography <casting@luminamodels.ca>',
      reply_to: 'luminaphotography.mtl@gmail.com',
      to:       [email],
      subject:  'Félicitations — Tu as été sélectionné(e) par Lumina Photography',
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="height:4px;background:#d4293a;"></td></tr>
  <tr><td style="padding:28px 40px 0;">
    <span style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;color:#d4293a;font-weight:700;">Lumina</span>
    <span style="font-family:Georgia,serif;font-size:14px;letter-spacing:0.2em;text-transform:uppercase;color:#0a0a0a;font-weight:300;margin-left:6px;">Photography</span>
  </td></tr>
  <tr><td style="padding:24px 40px 32px;">
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Bonjour <strong>${prenom}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Nous avons le plaisir de t'informer que ton profil a été <strong>sélectionné</strong> pour un projet Lumina Photography.</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Tu recevras très prochainement tous les détails concernant la session (date, lieu, heure de call time).</p>
    <p style="margin:0 0 32px;font-size:15px;color:#0a0a0a;line-height:1.7;"><strong>Merci de répondre à cet email pour confirmer ta disponibilité.</strong></p>
    <hr style="border:none;border-top:1px solid #e2e2e2;margin:0 0 20px;">
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">Hi <strong>${prenom}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">We're pleased to let you know that your profile has been <strong>selected</strong> for a Lumina Photography project.</p>
    <p style="margin:0 0 14px;font-size:15px;color:#0a0a0a;line-height:1.7;">You will receive all the details about the session (date, location, call time) very soon.</p>
    <p style="margin:0 0 0;font-size:15px;color:#0a0a0a;line-height:1.7;"><strong>Please reply to this email to confirm your availability.</strong></p>
  </td></tr>
  <tr><td style="padding:0 40px 28px;">
    <div style="border-top:1px solid #e2e2e2;padding-top:16px;">
      <span style="font-family:Georgia,serif;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#d4293a;font-weight:700;">Lumina</span>
      <span style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#0a0a0a;font-weight:300;margin-left:4px;">Photography</span>
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
```

- [ ] **Step 4 : Modifier `src/app/api/send-session/route.ts`**

Remplacer uniquement `verifyToken` inline + `Request` → `NextRequest` (le reste du fichier est intact) :

```typescript
// Remplacer les imports et la fonction verifyToken en haut du fichier.
// Le corps buildEmailHtml et le POST restent identiques.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// ... (garder buildEmailHtml identique)

export async function POST(request: NextRequest) {
  const token = await verifyToken(request)
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Session expirée. Reconnecte-toi.' },
      { status: 401 }
    )
  }
  // ... (garder le reste identique)
}
```

- [ ] **Step 5 : Commit**

```bash
git add src/app/api/candidatures/route.ts src/app/api/candidatures/[id]/route.ts src/app/api/select/route.ts src/app/api/send-session/route.ts
git commit -m "refactor: routes protégées — cookie httpOnly via verifyToken partagé"
```

---

### Task 5 : `admin/login/page.tsx` — supprimer localStorage

**Files:**
- Modify: `src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/verify-otp` retourne `{ success: true }` (plus de token)
- Produces: redirection vers `/admin/dashboard` — cookie posé automatiquement par l'API

- [ ] **Step 1 : Modifier `handleOtp` — supprimer le stockage localStorage**

Remplacer la fonction `handleOtp` :

```typescript
async function handleOtp(e: FormEvent) {
  e.preventDefault()
  setError('')
  setLoading(true)

  const res  = await fetch('/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token: code }),
  })
  const data = await res.json()

  setLoading(false)

  if (!data.success) {
    setError(data.message ?? 'Code invalide ou expiré.')
    return
  }

  // Le cookie httpOnly est posé par l'API — rien à stocker ici.
  router.push('/admin/dashboard')
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "refactor: login — supprime localStorage, cookie posé par l'API"
```

---

### Task 6 : `admin/dashboard/page.tsx` — supprimer localStorage token

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: cookie envoyé automatiquement par le navigateur sur chaque fetch
- Produces: même dashboard fonctionnel, sans aucune référence à `lumina_token` ou `lumina_refresh`

- [ ] **Step 1 : Supprimer la vérification localStorage au chargement**

Remplacer le `useEffect` de vérification initiale :

```typescript
useEffect(() => {
  fetchCandidatures()
}, [fetchCandidatures])
```

- [ ] **Step 2 : Mettre à jour `fetchCandidatures` — supprimer le header Authorization**

```typescript
const fetchCandidatures = useCallback(async () => {
  setLoading(true)
  // Le cookie httpOnly est envoyé automatiquement par le navigateur.
  const res  = await fetch('/api/candidatures')
  const data = await res.json()
  if (!data.success) {
    if (res.status === 401) router.replace('/admin/login')
    setLoading(false)
    return
  }
  setCandidatures(data.data)
  setLoading(false)
}, [router])
```

- [ ] **Step 3 : Mettre à jour le `useEffect` de refresh token**

```typescript
useEffect(() => {
  const refresh = async () => {
    // Le cookie lumina_refresh est lu par l'API — aucun body nécessaire.
    const res  = await fetch('/api/refresh', { method: 'POST' })
    const data = await res.json()
    if (!data.success) router.replace('/admin/login')
  }
  const id = setInterval(refresh, 50 * 60 * 1000)
  return () => clearInterval(id)
}, [router])
```

- [ ] **Step 4 : Mettre à jour `handleNotify` — supprimer le header Authorization**

```typescript
async function handleNotify() {
  const models = candidatures.filter(c => selectedIds.has(c.id))
  setNotifying(true)
  const results = await Promise.allSettled(
    models.map(c => fetch('/api/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: c.email, prenom: c.prenom, nom: c.nom }),
    }))
  )
  const sent        = results.filter(r => r.status === 'fulfilled').length
  const notifiedIds = new Set(models.map(c => c.id))
  setCandidatures(prev => prev.map(c => notifiedIds.has(c.id) ? { ...c, selectionne: true } : c))
  setNotifying(false)
  setConfirmNotify(false)
  showToast(`Notifications envoyées à ${sent} modèle(s).`)
}
```

- [ ] **Step 5 : Mettre à jour `handleToggleSelectionne` — supprimer Authorization**

```typescript
async function handleToggleSelectionne(c: Candidature) {
  const newVal = !c.selectionne
  const res    = await fetch(`/api/candidatures/${c.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectionne: newVal }),
  })
  if (!res.ok) { showToast('Erreur lors de la mise à jour.'); return }
  setCandidatures(prev => prev.map(x => x.id === c.id ? { ...x, selectionne: newVal } : x))
  setDetail(prev => prev?.id === c.id ? { ...prev, selectionne: newVal } : prev)
  showToast(newVal ? 'Marqué comme notifié.' : 'Notification annulée.')
}
```

- [ ] **Step 6 : Mettre à jour `handleDelete` — supprimer Authorization**

```typescript
async function handleDelete(id: string) {
  const res = await fetch(`/api/candidatures/${id}`, { method: 'DELETE' })
  if (!res.ok) { showToast('Erreur lors de la suppression.'); return }
  setCandidatures(prev => prev.filter(c => c.id !== id))
  setDetail(null)
  showToast('Candidature supprimée.')
}
```

- [ ] **Step 7 : Mettre à jour `handleSendSession` — supprimer Authorization**

```typescript
async function handleSendSession(e: FormEvent) {
  e.preventDefault()
  const models = candidatures.filter(c => selectedIds.has(c.id)).map(c => ({ email: c.email, prenom: c.prenom }))
  setSending(true)
  const res  = await fetch('/api/send-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ models, ...session }),
  })
  const data = await res.json()
  setSending(false)
  setComposerOpen(false)
  showToast(`Session envoyée à ${data.sent} modèle(s).${data.failed ? ` (${data.failed} échec)` : ''}`)
  clearSelection()
}
```

- [ ] **Step 8 : Mettre à jour `logout` — effacer le cookie via l'API**

Ajouter une route `src/app/api/logout/route.ts` :

```typescript
// logout — efface les cookies httpOnly côté serveur.
// Un cookie httpOnly ne peut pas être supprimé côté client en JS.
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('lumina_token',  '', { maxAge: 0, path: '/admin' })
  response.cookies.set('lumina_refresh', '', { maxAge: 0, path: '/api/refresh' })
  return response
}
```

Puis mettre à jour `logout` dans le dashboard :

```typescript
async function logout() {
  await fetch('/api/logout', { method: 'POST' })
  router.replace('/admin/login')
}
```

- [ ] **Step 9 : Commit**

```bash
git add src/app/admin/dashboard/page.tsx src/app/api/logout/route.ts
git commit -m "refactor: dashboard — supprime localStorage, cookie httpOnly transparent"
```

---

## Vérification finale

- [ ] Ouvrir `https://luminamodels.ca/admin/login`
- [ ] Se connecter avec l'email admin + code OTP
- [ ] Vérifier dans DevTools → Application → Cookies : `lumina_token` présent, `HttpOnly` coché
- [ ] Vérifier que le dashboard charge les candidatures
- [ ] Vérifier que `localStorage` ne contient plus `lumina_token` ni `lumina_refresh`
- [ ] Tester la déconnexion → redirection login + cookie supprimé
