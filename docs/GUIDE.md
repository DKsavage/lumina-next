# Guide d'utilisation — Flawa Models

> **Production :** [luminamodels.ca](https://luminamodels.ca)  
> **Stack :** Next.js 15 App Router · TypeScript strict · Tailwind v4 · Supabase · Resend

---

## Sommaire

1. [Inscription des modèles (formulaire public)](#1-inscription-des-modèles)
2. [Dashboard admin — Gestion des candidatures](#2-dashboard-admin--gestion-des-candidatures)
3. [Sessions de shooting](#3-sessions-de-shooting)
4. [SessionComposer — Inviter des modèles](#4-sessioncomposer--inviter-des-modèles)
5. [Suivi des confirmations (SessionStatusPanel)](#5-suivi-des-confirmations)
6. [Availability Finder — Filtrer par disponibilité](#6-availability-finder)
7. [Système d'emails](#7-système-démails)
8. [Factures](#8-factures)
9. [Variables d'environnement](#9-variables-denvironnement)
10. [Référence API](#10-référence-api)

---

## 1. Inscription des modèles

**URL publique :** `luminamodels.ca/`

Le formulaire se déroule en 4 étapes.

### Étape 1 — Profil & photos
| Champ | Type | Obligatoire |
|---|---|---|
| Photo profil (`profilFile`) | Fichier image | ✅ |
| Photo corps (`bodyFile`) | Fichier image | ✅ |
| Prénom | Texte | ✅ |
| Nom | Texte | ✅ |
| Email | Email | ✅ |
| Téléphone | Texte | ✅ |
| Taille (cm) | Nombre | ✅ |
| Genre | Sélection | ✅ |

**Photos :** max 1,5 Mo côté serveur. Si > 1 Mo, compression automatique via Web Worker (JPEG). Les fichiers HEIC/HEIF sont convertis automatiquement en JPEG.

### Étape 2 — Localisation & expérience
| Champ | Obligatoire |
|---|---|
| Ville | ✅ |
| Expérience | ✅ |
| Pays | ❌ |
| Instagram | ❌ |

### Étape 3 — Mensurations
| Champ | Notes |
|---|---|
| Poitrine | Cm |
| Tour de taille | Cm |
| Hanches | Cm |
| Pointure | EU |
| Taille haut | XXS → XXL |
| Taille bas | US 24–40 |
| Teint | Sélection |
| Couleur des yeux | Sélection |
| Poids | ❌ optionnel |
| Longueur cheveux | ❌ optionnel |
| Couleur cheveux | ❌ optionnel |

### Étape 4 — Disponibilités
| Champ | Notes |
|---|---|
| Date de naissance | ISO (YYYY-MM-DD) |
| Disponibilité | Flexible / Jours de semaine / Weekends / Voyages OK |
| Langues | ❌ optionnel |
| Aspect recherché | ❌ optionnel |

**Protection anti-spam :** reCAPTCHA v3 (seuil 0,5). Skippé automatiquement en dev si la clé est absente.

**Rate limit :** 1 soumission par IP toutes les 60 secondes.

---

## 2. Dashboard admin — Gestion des candidatures

**URL :** `luminamodels.ca/admin/dashboard`  
**Accès :** email OTP à 8 chiffres envoyé à `casting@luminamodels.ca`

### Connexion
1. Aller sur `/admin/login`
2. Entrer l'email admin
3. Recevoir le code OTP à 8 chiffres par email
4. Saisir le code → session créée (cookie httpOnly)

### Interface principale

**KPI Strip** (en haut) — affiche en temps réel :
- Total candidatures
- Nouvelles (< 7 jours)
- Sélectionnées
- Avec photos

**Filtres inline** — barre de recherche + filtres rapides :
- Genre (H/F/Non-binaire)
- Taille (cm)
- Ville
- Tier (Ambassadeur / Premium / Standard)
- Disponibilité
- Sélectionné·e / Non sélectionné·e
- Date de dispo (**Availability Finder**)

**Filtres avancés** (drawer) — clic sur l'icône filtres :
- Expérience
- Mensurations (poitrine, hanches, taille bas, etc.)
- Teint, yeux, cheveux

### CandidatureCard

Chaque carte affiche :
- Photo profil (hover → photo corps si disponible)
- Tier chip cliquable (dropdown : Ambassadeur / Premium / Standard / Retirer)
- Nom, taille, genre, ville
- Tag de disponibilité
- Badge "Nouveau" si inscription < 7 jours
- Bouton **Voir le profil** (icône œil) → ouvre `DetailPanel`

**Sélectionner** une candidature : clic sur la carte ou sur le dot en haut à gauche. La carte passe en état sélectionné (contour rouge).

### DetailPanel

Panneau latéral avec toutes les informations du modèle :
- Photos (lightbox au clic)
- Toutes les mensurations
- Disponibilité, langues, expérience
- Bouton **Modifier** (icône crayon) → édition inline

### Sélection en masse

1. Cocher plusieurs modèles (dot sélection)
2. La **FloatingBar** apparaît en bas de page avec le nombre sélectionné
3. Clic "Sélectionner" → email de sélection envoyé à chacun + `selectionne=true` en DB

---

## 3. Sessions de shooting

**URL :** `luminamodels.ca/admin/sessions`

### Créer une session
Formulaire avec :
| Champ | Notes |
|---|---|
| Nom du projet | Ex. "Lumina Été 2026" |
| Type | Photoshoot / Défilé / Vidéo / Autre |
| Date | YYYY-MM-DD |
| Adresse | Lieu du shooting |
| Instructions d'accès | ❌ optionnel (code d'entrée, étage…) |
| Contact sur place | Nom + téléphone ❌ optionnel |
| Max modèles | Nombre cible |
| Compensation | TFP / Rémunéré (montant, méthode, délai) |
| Préparation | Instructions de prep ❌ optionnel |
| Look attendu | Description du style ❌ optionnel |
| Apporter | Liste matériel ❌ optionnel |
| Notes internes | ❌ optionnel |
| Mood board (URL) | ❌ optionnel |
| Lien WhatsApp groupe | ❌ optionnel |

### Groupes et call times
Chaque session peut avoir plusieurs **groupes** (ex. Groupe A → 09h00, Groupe B → 13h00).
Les modèles sont assignés à un groupe — leur email d'invitation affiche leur call time en rouge/gras.

### États d'une session
- `draft` — en préparation
- `active` — invitations envoyées
- `completed` — tournage terminé
- `cancelled` — annulée

---

## 4. SessionComposer — Inviter des modèles

Le SessionComposer s'ouvre depuis la liste des sessions. Il permet de :

1. **Parcourir les candidatures** avec les mêmes filtres que le dashboard
2. **Voir les modèles déjà dans la session** (section "Déjà invités")
3. **Voir les modèles disponibles** à la date du shooting (Availability Finder intégré)
4. **Sélectionner** des modèles à inviter
5. **Assigner à un groupe** (call time)
6. **Envoyer les invitations** → bouton "Envoyer à N modèle(s)"

**Envoi :** chaque modèle reçoit un email bilingual EN/FR avec :
- Date, lieu, call time de son groupe
- Instructions de préparation / look
- Boutons de confirmation (Confirmer / Je ne serai pas disponible)

---

## 5. Suivi des confirmations

**SessionStatusPanel** — s'ouvre depuis la liste des sessions (clic sur la session).

### Onglets
- **Tous confirmés** — modèles ayant cliqué "Confirmer"
- **En attente** — modèles n'ayant pas encore répondu (icône ⧗)
- **Annulés** — modèles ayant décliné (icône ✗)

### Boutons de relance
Chaque bouton envoie un email aux modèles **non-encore relancés** (anti-doublon via `sent_at` en DB) :

| Bouton | Destinataires | Email envoyé |
|---|---|---|
| Relancer J-5 | Pending | Rappel "5 jours avant" |
| Relancer J-2 | Pending | Rappel "2 jours avant" |
| Récap J-1 | Confirmés | Récapitulatif "demain" |
| Récap Matin | Confirmés | Récapitulatif "aujourd'hui" |
| Envoyer Merci | Confirmés | Remerciement post-session |
| Envoyer Paiement | Confirmés | Notification paiement + lien facture |

### Compensation par modèle
Dans l'onglet "Confirmés", chaque modèle a un **toggle TFP / Rémunéré** :
- **TFP** (par défaut) — aucun montant, aucune facture
- **Rémunéré** — clic active un champ de montant + lien vers la facture du modèle

### Bouton ↻ Rafraîchir
Recharge les données du panneau sans recharger la page entière.

---

## 6. Availability Finder

**Filtre "Dispo le"** dans la barre de filtres du dashboard et du SessionComposer.

**Fonctionnement :**
1. Saisir une date dans le filtre "Dispo le"
2. L'API `GET /api/candidatures/available?date=YYYY-MM-DD` est appelée
3. Retourne les modèles disponibles à cette date, en excluant ceux qui ont une **session confirmée ce jour-là**

**Logique de disponibilité :**
- `Flexible` → disponible tout le temps
- `Jours de semaine` → disponible lundi–vendredi (calcul UTC midi pour éviter les décalages Montréal)
- `Weekends` → disponible samedi–dimanche
- `Voyages OK` → disponible tout le temps

**`AvailabilityBadge`** — badge affiché sur les modèles dans le SessionComposer quand le filtre de date est actif :
- Vert "Disponible" si le modèle est libre
- Rouge "Indisponible" si le modèle a déjà une session confirmée ce jour-là

---

## 7. Système d'emails

Tous les emails utilisent le design **Lumina Editorial** :
- Fond extérieur `#F7F3EE` (crème)
- Header `#8B0020` (rouge foncé) avec nom du projet en grande Georgia
- Sections bilingues `· EN ·` / `· FR ·`
- Boutons CTA empilés pleine largeur (sans border-radius)
- Footer crème avec coordonnées

### Types d'emails

| Route | Déclencheur | Destinataire |
|---|---|---|
| `/api/select` | Admin clique "Sélectionner" | Modèle |
| `/api/send-session` | Admin envoie les invitations | Modèle |
| `/api/sessions/remind` (j5/j2) | Admin clique "Relancer" | Modèles pending |
| `/api/sessions/remind` (j1/morning) | Admin clique "Récap" | Modèles confirmés |
| `/api/sessions/remind` (merci) | Admin clique "Envoyer Merci" | Modèles confirmés |
| `/api/sessions/remind` (paiement) | Admin clique "Envoyer Paiement" | Modèles confirmés |
| `/api/confirm` (confirmed) | Modèle clique "Confirmer" | Modèle |
| `/api/confirm` (cancelled) | Modèle clique "Annuler" | Modèle + Admin |

**Expéditeur :** `Flawa Models <casting@luminamodels.ca>`  
**Anti-doublon :** chaque rappel est tracé en DB (`reminder_j5_sent_at`, etc.) — un re-clic sur "Relancer" n'envoie pas de doublon.

### Lien de confirmation

Chaque modèle invité reçoit un token UUID unique dans son email.  
URL : `luminamodels.ca/confirm/[token]?status=confirmed` ou `?status=cancelled`

La page `/confirm/[token]` lit le statut en DB et affiche un récapitulatif (date, lieu, call time).

---

## 8. Factures

**URL modèle :** `luminamodels.ca/facture/[token]`
**URL admin :** `luminamodels.ca/admin/factures`
**Accès modèle :** token UUID transmis dans l'email "Paiement envoyé"
**Accès admin :** authentifié, comme le reste de `/admin`

### Fonctionnement

1. Admin bascule un modèle confirmé sur "Rémunéré" dans SessionStatusPanel — un
   trigger Postgres assigne alors automatiquement un numéro de facture
   (`FLW-{année}-{séquence}`) et passe le statut à "Envoyée".
2. Le modèle reçoit un lien vers sa facture personnalisée.
3. Le modèle peut éditer le **montant** et son **adresse** directement sur la
   page (champs inline → sauvegarde auto `onBlur`). L'adresse est liée au
   modèle (pas à la facture) — elle pré-remplit toutes ses factures futures.
4. Clic "Imprimer la facture" → le navigateur imprime.

### Page admin `/admin/factures`

- Bascule **Par session / Par modèle**.
- Filtres : statut (En attente/Envoyée/Payée), plage de dates, recherche texte.
- Clic sur le badge de statut → fait défiler En attente → Envoyée → Payée.
  Pas de détection automatique du retour de facture signée (arrive par email
  personnel, hors app) — ce badge est mis à jour manuellement.
- Bouton "Renvoyer" (✉) sur chaque facture → renvoie l'email "Paiement" à ce
  modèle précis, sans repasser par SessionStatusPanel.
- Bouton "Exporter CSV" → export des factures filtrées actuellement affichées.
- Bouton "Vue imprimable" → liste tabulaire pensée pour `window.print()`.

### PATCH du montant / de l'adresse

`PATCH /api/facture/[token]` — authentifié par le token UUID (pas de session
admin nécessaire). Accepte `{ payment_amount }` et/ou `{ adresse }`.

---

## 9. Variables d'environnement

À configurer dans Vercel (Settings → Environment Variables) :

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL de votre projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé `service_role` — côté serveur uniquement, jamais exposée au client |
| `SUPABASE_ANON_KEY` | Clé `anon` — côté client (si nécessaire) |
| `RESEND_API_KEY` | Clé API Resend pour l'envoi d'emails |
| `RECAPTCHA_SECRET_KEY` | Clé secrète reCAPTCHA v3 (seuil 0,5) |
| `CRON_SECRET` | Secret pour protéger `/api/cron/reminders` |
| `RESEND_WEBHOOK_SECRET` | Secret pour vérifier la signature des webhooks Resend |

---

## 10. Référence API

Toutes les routes nécessitent un cookie de session admin (sauf `/api/submit`, `/api/confirm`, `/api/facture/[token]`).

### Candidatures
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/candidatures` | Liste toutes les candidatures |
| `GET` | `/api/candidatures/available?date=` | Modèles disponibles à une date donnée |
| `PATCH` | `/api/candidatures/[id]` | Modifier une candidature (tier, tags…) |
| `POST` | `/api/submit` | Soumettre une inscription (public) |
| `POST` | `/api/select` | Sélectionner un modèle + envoyer email |

### Sessions
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/sessions` | Liste toutes les sessions |
| `POST` | `/api/sessions` | Créer une session |
| `GET` | `/api/sessions/[id]` | Détail d'une session |
| `PATCH` | `/api/sessions/[id]` | Modifier une session |
| `GET` | `/api/sessions/[id]/models` | Modèles d'une session |
| `GET` | `/api/sessions/[id]/participants` | Stats de participation |
| `GET` | `/api/sessions/by-model?email=` | Sessions d'un modèle |
| `POST` | `/api/send-session` | Envoyer les invitations d'une session |
| `POST` | `/api/sessions/remind` | Envoyer un rappel (type: j5/j2/j1/morning/merci/paiement) |

### Confirmation & Facture
| Méthode | Route | Description |
|---|---|---|
| `GET/POST` | `/api/confirm?token=&status=` | Confirmer ou annuler une participation |
| `GET` | `/api/facture/[token]` | Données de la facture |
| `PATCH` | `/api/facture/[token]` | Modifier le montant de la facture |

### Auth
| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/otp` | Demander un code OTP |
| `POST` | `/api/verify-otp` | Vérifier le code OTP |
| `POST` | `/api/logout` | Déconnexion |
| `POST` | `/api/refresh` | Rafraîchir la session |

### Divers
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/search` | Recherche fulltext candidatures |
| `GET` | `/api/statut` | Statut d'une inscription (par email) |
| `POST` | `/api/cron/reminders` | Cron automatique (protégé par `CRON_SECRET`) |
| `POST` | `/api/webhooks/resend` | Webhook Resend (tracking emails) |

---

*Dernière mise à jour : 2026-07-03*
