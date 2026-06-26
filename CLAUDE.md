@AGENTS.md

# CLAUDE.md — lumina-next (Lumina Photography)

Lis ce fichier en entier avant de commencer. Il remplace la mémoire de session.

---

## Règles Claude — à appliquer sans exception

### Démarrage de session
1. **Ce fichier en premier** — avant tout `Read`, avant toute exploration.
2. **Mettre à jour ce fichier** toutes les 30 min et après chaque session significative.

### Graphify — règle active en permanence

Quand l'utilisateur tape `/graphify` → invoquer le skill `graphify` avant toute autre action.

- Si `graphify-out/GRAPH_REPORT.md` existe → le lire en premier, répondre depuis le graphe si possible.
- Ne relire un fichier source que si le graphe est insuffisant.
- Après toute découverte d'un nouveau composant, hook, type, route → annoter dans `graphify-out/`.
- **Pas de graphify-out** → lancer `/graphify .` avant toute exploration.

### Économie de tokens — CLAUDE.md (< 150 lignes, < 8 Ko)

À chaque session :
1. **Supprimer les items terminés** : tout `[x]` → effacer (historique dans `git log`).
2. **Supprimer les arborescences** : les arbres `├──` → lisibles via `ls` ou le graphe.
3. **Ne pas dupliquer le graphe** : ce qui est dans `graphify-out/` ne doit pas être ici.
4. **Phases terminées** : condenser en 1 ligne, jamais de détail par item.
5. **Limite stricte** : si ce fichier > 150 lignes → tailler avant de commencer.

### Économie de tokens — Memory (< 3 Ko total, max 5 fichiers)

1. **Pas de doublon CLAUDE.md** : si l'info est déjà ici → ne pas la sauvegarder en mémoire.
2. **Pas de phases terminées** en mémoire — elles appartiennent au git.
3. **Limite par fichier** : < 500 octets. Si plus long → condenser ou supprimer.
4. **Limite MEMORY.md** : max 8 lignes (index seulement, jamais de contenu).
5. **Audit automatique** : si total mémoire projet > 3 Ko → nettoyer avant de commencer.

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
- **URL prod** : `https://luminamodels.ca` — live en production

---

## Stack

Next.js 15 App Router · TypeScript strict · Tailwind v4 · shadcn/ui · Framer Motion · Supabase (table `candidatures`, bucket `photos-candidatures`, Auth OTP 8 chiffres) · Resend `casting@luminamodels.ca` · reCAPTCHA v3 clé `6LddUeAsAAAAAO4fcgYselTJy8a0EBen0SoPookQ`

---

## Direction artistique

Fond `#F7F3EE` · Rouge `#8B0020` · Cormorant Garamond 300 italic (display) · Montserrat 200/300/500 (UI)

---

## FormData — champs

- **Étape 1** : `profilFile`, `bodyFile` (File) · `prenom`, `nom`, `email`, `telephone`, `taille`, `genre`
- **Étape 2** : `ville`, `experience` · optionnel : `pays`, `instagram`
- **Étape 3** : `poitrine`, `tailleMes`→`tour_taille`, `hanches`, `pointure` (EU), `tailleHaut` (XXS→XXL), `tailleBas` (US 24-40), `teint`, `yeux` · optionnel : `poids`, `longueurCheveux`, `cheveux`
- **Étape 4** : `dateNaissance` (ISO), `disponibilite` · optionnel : `langues`, `aspect`

---

## Variables d'environnement

`SUPABASE_URL` · `SUPABASE_SERVICE_KEY` · `SUPABASE_ANON_KEY` · `RESEND_API_KEY` · `RECAPTCHA_SECRET_KEY` · `CRON_SECRET` · `RESEND_WEBHOOK_SECRET`

---

## Phases

Phases 0–11 terminées (voir git log).

**Phase 11** (2026-06-26) : Emails bilingues EN/FR (EN en premier, séparateur 2px, tous les templates), remerciement + paiement post-session, cron automatique (J-5/J-2/J-1/matin, `vercel.json`), tracking emails Resend (livré/cliqué/bounce, webhook Svix HMAC), tags/labels modèles, notes internes, répartition paiement par modèle, page facture imprimable `/facture/[token]` (template Word Lumina, numéro auto `LUM-YYYY-TOKEN`).

**Nouvelles routes Phase 11 :**
- `GET /api/cron/reminders` — cron 13h UTC, anti-doublon via `sent_at`
- `POST /api/webhooks/resend` — events livré/cliqué/bounce
- `GET /api/facture/[token]` — données facture publiques
- `PATCH /api/sessions/models/[id]` — payment_amount par modèle
- `src/app/facture/[token]/page.tsx` — page imprimable

**Backlog actif :**
- Portfolio photos par modèle (page publique, consentement, galerie)
- Photos site public (refonte page d'accueil)

**Variables à ajouter sur Vercel si pas encore fait :**
- `CRON_SECRET` — protège `/api/cron/reminders`
- `RESEND_WEBHOOK_SECRET` — vérifie la signature des webhooks Resend

---

## Points techniques critiques

1. **reCAPTCHA** : v3, seuil 0.5 — conditionnel en dev (skippé si clé absente)
2. **Photos** : max 1,5 Mo côté serveur (`getBase64Size()`) — compression si > 1 Mo via `browser-image-compression` (Web Worker, `fileType:'image/jpeg'`)
3. **HEIC** : `file.type === 'image/heic'` ou extension `.heic/.heif` → compression forcée → sortie JPEG
4. **Erreurs API** : try/catch global → `NextResponse.json({success:false, message})` — jamais de HTML 500 brut
5. **Rate limit** : 60s par IP via `Map<string, number>` en mémoire (reset au cold start)
6. **`FileReader.readAsDataURL()`** : seul moyen de sérialiser un `File` en JSON pour l'API
7. **`URL.createObjectURL()`** + `revokeObjectURL()` pour la preview photo (mémoire locale)
8. **Supabase Storage** : bucket privé (RLS actif) — bypass via clé `service_role` uniquement
