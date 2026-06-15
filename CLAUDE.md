@AGENTS.md

# CLAUDE.md — lumina-next (Lumina Photography)

Lis ce fichier en entier avant de commencer. Il remplace la mémoire de session.
**Mise à jour : toutes les 30 minutes ou après chaque bloc de code significatif.**

---

## Règles Claude — à appliquer sans exception

### Démarrage de session
1. **Ce fichier en premier** — avant tout `Read`, avant toute exploration.
2. **Graphify en premier** : si `graphify-out/GRAPH_REPORT.md` existe → le lire avant tout `Read`. Répondre depuis le graphe si possible. Ne relire un fichier source que si le graphe est insuffisant.
3. **Pas de graphify-out** → lancer `/graphify .` immédiatement avant toute exploration.
4. **Mettre à jour ce fichier** toutes les 30 min et après chaque session significative.

### Graphify — règle active en permanence
- Après chaque `Read` sur un fichier source, vérifier si le graphe doit être mis à jour.
- Après toute découverte d'un nouveau composant, hook, type, route → `/graphify` ou annoter dans `graphify-out/`.
- Le graphe est la carte du projet — le maintenir à jour évite de relire des fichiers déjà explorés.
- Si une question peut être répondue depuis le graphe → répondre sans relire le fichier brut.

### Règles Git
1. **Conventional Commits** : `feat:`, `fix:`, `refactor:`, `perf:`, `chore:`, `docs:`, `test:`, `style:`
2. **`git add` sélectif** — jamais `git add .`, toujours `git add <fichier>` ciblé.
3. **Pas de `Co-Authored-By: Claude`** dans les commits.

### Règles Code
1. **Modifier le fichier existant** — jamais réécrire from scratch.
2. **TypeScript strict** — `npx tsc --noEmit` doit retourner 0 erreur avant tout commit.
3. **`SUPABASE_SERVICE_KEY` côté serveur uniquement** — jamais `NEXT_PUBLIC_`.
4. **`next/image` obligatoire** — jamais `<img>` nu.

### Style de réponse
1. **Mode pédagogique** — expliquer le POURQUOI des choix techniques dans les insights.
2. **Commentaires dans le code** — uniquement le POURQUOI, jamais le QUOI.

---

## Projet

Migration **Lumina Photography** de HTML vanilla → Next.js 15.
Agence de casting international, formulaire d'inscription mannequins.

- **Repo** : `lumina-next`, branche `main` → auto-deploy Vercel
- **Ancien site** : `studio-modeles/` (HTML vanilla, Vercel Functions)
- **URL** : `https://luminamodels.ca` — live en production

---

## Stack technique

| Couche | Outil |
|---|---|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript strict |
| Styles | Tailwind CSS v4 |
| Composants UI | shadcn/ui |
| Animations | Framer Motion |
| Images | `next/image` avec `fill` + `priority` |
| Backend | Route Handlers (`app/api/`) |
| Base de données | Supabase PostgreSQL — table `candidatures` |
| Stockage photos | Supabase Storage — bucket `photos-candidatures` |
| Auth | Supabase Auth OTP 8 chiffres |
| Emails | Resend — `casting@luminamodels.ca` |
| Anti-bot | reCAPTCHA v3 (seuil 0.5) — clé `6LddUeAsAAAAAO4fcgYselTJy8a0EBen0SoPookQ` |
| Hosting | Vercel |

---

## Direction artistique — Couture Blanche (Mockup D)

| Élément | Valeur |
|---|---|
| DA | Loro Piana · Hermès · The Row — luxe éditorial |
| Fond | `#F7F3EE` papier chaud (grain SVG) |
| Rouge | `#8B0020` profond |
| Police display | Cormorant Garamond 300 italic |
| Police UI | Montserrat 200/300/500 |
| Layout hero | Split 48/52 — formulaire gauche, photo Ken Burns droite |
| Formulaire | 4 étapes, inputs underline-only, 0 border-radius |
| Animations | Ken Burns 14s, clip-path text reveal, count-up, scroll reveal |
| Curseur | Croix rouge fine (custom CSS) |

---

## Fichiers principaux

```
src/
├── app/
│   ├── page.tsx                  → Hero split (photo + form)
│   ├── layout.tsx                → Font load, metadata, viewport
│   ├── globals.css               → TOUS les tokens CSS + règles luxe
│   ├── admin/
│   │   ├── login/page.tsx        → Login OTP admin
│   │   └── dashboard/page.tsx    → Dashboard candidatures
│   └── api/
│       ├── submit/route.ts       → POST candidature (honeypot + rate limit + reCAPTCHA + Supabase)
│       ├── candidatures/route.ts → GET liste (auth JWT)
│       ├── login/route.ts        → POST envoi OTP
│       ├── otp/route.ts          → POST vérification OTP → session
│       ├── verify-otp/route.ts   → Helper vérif OTP Supabase
│       ├── select/route.ts       → POST sélection mannequins
│       └── send-session/route.ts → POST envoi convocations Resend
└── components/
    ├── hero/
    │   ├── HeroSplit.tsx         → Split 48/52
    │   └── PhotoSlideshow.tsx    → Ken Burns 5 slides
    ├── form/
    │   ├── CandidatureForm.tsx   → Multi-step + appel API async
    │   ├── StepPhotos.tsx        → Étape 1 (photos + identité) + composants partagés
    │   ├── StepProfil.tsx        → Étape 2 (ville, expérience)
    │   ├── StepMesures.tsx       → Étape 3 (mensurations + apparence)
    │   ├── StepDisponibilite.tsx → Étape 4 (naissance, langues, dispo)
    │   └── Confirmation.tsx      → Écran de confirmation clip-path
    └── sections/
        ├── StatsBar.tsx          → Count-up animé
        ├── PhotoStrip.tsx        → Bandes défilantes staggerées
        ├── ProcessSection.tsx
        ├── DarkSection.tsx
        └── SiteFooter.tsx
```

---

## FormData — champs requis / optionnels

| Étape | Champ | Type | Statut |
|---|---|---|---|
| 1 | `profilFile` | File | Requis |
| 1 | `bodyFile` | File | Requis |
| 1 | `prenom`, `nom`, `email`, `telephone` | string | Requis |
| 1 | `taille` | string (cm) | Requis |
| 1 | `genre` | string | Requis |
| 2 | `ville` | string | Requis |
| 2 | `experience` | string | Requis |
| 2 | `pays`, `instagram` | string | Optionnel |
| 3 | `poitrine`, `tailleMes`, `hanches` | string (cm) | Requis |
| 3 | `pointure` | string (EU 34-46) | Requis |
| 3 | `tailleHaut` | string (XXS/XS/S/M/L/XL/XXL) | Requis |
| 3 | `tailleBas` | string (US 24-40) | Requis |
| 3 | `teint` | string (Très clair→Ébène) | Requis |
| 3 | `yeux` | string (chips) | Requis |
| 3 | `poids`, `longueurCheveux`, `cheveux` | string | Optionnel |
| 4 | `dateNaissance` | string (ISO) | Requis |
| 4 | `disponibilite` | string (chips) | Requis |
| 4 | `langues`, `aspect` | string | Optionnel |

---

## Mapping API → Supabase

`tailleMes` (formulaire) → `tour_taille` (colonne DB).
`tailleHaut` → `taille_haut`, `tailleBas` → `taille_bas`, `teint` → `teint`.
Photos base64 uploadées sur `photos-candidatures/` bucket.

### Colonnes DB actives (juin 2026)
```
id, prenom, nom, email, telephone, instagram, genre
taille, poitrine, tour_taille, hanches, poids, pointure
taille_haut, taille_bas (text — non supprimées, maintenant remplies)
teint, couleur_yeux, longueur_cheveux, couleur_cheveux, aspect
ville, pays, date_naissance, langues, disponibilite, experience
photo_profil_url, photo_body_url, date_inscription (DEFAULT now())
```
Colonnes présentes mais inutilisées (ne pas supprimer pour l'instant) : aucune.

---

## Variables d'environnement

```bash
SUPABASE_URL=https://xkkvudlpuvvctkbklsox.supabase.co  # SANS /rest/v1/ — sinon storage cassé
SUPABASE_SERVICE_KEY=eyJ...   # service_role — serveur uniquement (bypass RLS)
SUPABASE_ANON_KEY=eyJ...      # anon — auth admin OTP uniquement
RESEND_API_KEY=re_...
RECAPTCHA_SECRET_KEY=6Ldd...  # v3
```

> **Piège connu** : `SUPABASE_URL` avec `/rest/v1/` suffit → storage retourne 404 PGRST125.
> `SUPABASE_SERVICE_KEY` doit être la clé `service_role` (pas `anon`) — sinon RLS bloque l'upload.
> Vérifier le rôle JWT : `JSON.parse(atob(key.split('.')[1])).role` doit retourner `"service_role"`.

---

## Checklist migration Phase 7

- [x] `npx create-next-app@latest` → TypeScript, Tailwind v4, App Router
- [x] `npx shadcn@latest init -d`
- [x] Tokens CSS DA Couture Blanche dans `globals.css`
- [x] `PhotoSlideshow.tsx` — Ken Burns 5 slides
- [x] `HeroSplit.tsx` — layout split + mobile
- [x] Formulaire 4 étapes complet (Photos / Profil / Mesures / Disponibilité)
- [x] Animations : shell entrance, stagger fields, input underline L→R, vertical step transitions
- [x] Confirmation : clip-path name reveal, rule scaleX
- [x] Sections : StatsBar, ProcessSection, PhotoStrip, DarkSection, SiteFooter
- [x] Routes API complètes (submit, candidatures, login, otp, verify-otp, select, send-session)
- [x] Dashboard admin (login + dashboard)
- [x] Appel API réel dans CandidatureForm (base64 + loading + error state)
- [x] Preview photo dans les zones upload
- [x] International : ville/pays libre, pointure EU, stats "Nationalités", sans références Montréal
- [x] Supabase migration colonnes nouvelles (juin 2026)
- [x] `npx tsc --noEmit` → 0 erreur
- [x] Variables d'env configurées sur Vercel (Production) — 6 variables chiffrées
- [x] Domaine `luminamodels.ca` + `www.luminamodels.ca` → Vercel Production (juin 2026)
- [x] Tests API prod confirmés : GET / → 200, honeypot → success silencieux, payload vide → erreur propre
- [x] Test end-to-end : soumission réelle confirmée (Playwright + vérification DB juin 2026)
- [x] Compression image automatique côté client (Option C) — browser-image-compression, Web Worker, seuils 1 Mo / 1,5 Mo
- [x] Support HEIC/HEIF (iPhone) — détection par type/extension + conversion forcée JPEG
- [x] Gestion erreurs API : try/catch global dans POST /api/submit → JSON en cas d'erreur (plus de "connexion impossible")
- [x] Nouveaux champs formulaire étape 3 : tailleHaut (XXS→XXL), tailleBas (US 24-40), teint (6 valeurs)
- [x] Labels formulaire plus visibles : .52rem/38% → .62rem/68% (inline), .65rem/55% → .72rem/72% (groupe)

---

## État du projet (juin 2026)

- **Site live** : `luminamodels.ca` → Vercel Production, 0 erreur TypeScript
- **Formulaire** : 4 étapes fonctionnelles, 15 champs requis + 6 optionnels, API connectée
- **Supabase** : storage bucket `photos-candidatures` opérationnel, toutes colonnes remplies
- **Resend** : emails candidat + admin envoyés à chaque soumission
- **Test E2E** : confirmé via Playwright (juin 2026) — soumission → DB → storage → confirmation

---

## Points techniques critiques

1. **reCAPTCHA** : v3, seuil 0.5 — conditionnel en dev (skippé si clé absente)
2. **Photos** : max 1,5 Mo côté serveur (`getBase64Size()`) — compression client si > 1 Mo via `browser-image-compression` (Web Worker, `fileType:'image/jpeg'`)
3. **HEIC** : détecté par `file.type === 'image/heic'` ou extension `.heic/.heif` → compression forcée → sortie JPEG universelle
4. **Erreurs API** : try/catch autour de uploadPhoto + DB insert → `NextResponse.json({success:false, message})` — jamais de HTML 500 brut
5. **Rate limit** : 60s par IP via `Map<string, number>` en mémoire (reset au cold start)
6. **`FileReader.readAsDataURL()`** : seul moyen de sérialiser un `File` en JSON pour l'API
7. **`URL.createObjectURL()`** + `revokeObjectURL()` pour la preview photo (mémoire locale)
8. **Ken Burns** : CSS animation sur le container, pas sur `next/image` directement
9. **Supabase Storage** : bucket `photos-candidatures` privé (RLS actif, 0 policy) — bypass uniquement via clé `service_role`
