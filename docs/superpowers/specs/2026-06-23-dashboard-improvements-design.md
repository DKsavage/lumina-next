# Design — Améliorations Dashboard Admin
**Date :** 2026-06-23
**Projet :** lumina-next
**Approche choisie :** C — Sécurité → Structure → UX (tâche par tâche)

---

## Contexte

Le dashboard admin (`src/app/admin/dashboard/page.tsx`) fait 877 lignes dans un seul fichier.
Il gère : authentification, fetch candidatures, filtres, tri, sélection, notifications, composer session, panel détail, lightbox, toasts.

Problèmes identifiés :
- Token JWT stocké en `localStorage` → vulnérable au vol XSS
- Fichier monolithique → difficile à maintenir et tester
- Plusieurs problèmes UX mineurs (hit areas, transitions, tabular-nums)
- Quelques failles sécurité secondaires (pas de timeout inactivité, pas de validation réponses API)

---

## Section 1 — Sécurité (httpOnly cookies)

### Objectif
Remplacer `localStorage` par des cookies `httpOnly` pour que le token ne soit jamais accessible au JavaScript.

### Configuration du cookie
```
name: 'lumina_token'
httpOnly: true       → invisible au JS
secure: true         → HTTPS uniquement
sameSite: 'strict'   → bloque CSRF
maxAge: 3600         → expire en 1h
path: '/admin'       → limité à la zone admin
```

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `api/verify-otp/route.ts` | Pose le cookie via `cookies().set()` au lieu de retourner `{ token }` |
| `api/refresh/route.ts` | Lit le cookie entrant, pose un nouveau cookie |
| `api/candidatures/route.ts` | Lit le token depuis `cookies().get('lumina_token')` |
| `api/candidatures/[id]/route.ts` | Idem |
| `api/select/route.ts` | Idem |
| `api/send-session/route.ts` | Idem |
| `admin/login/page.tsx` | Supprime `localStorage.setItem` — le cookie est posé par l'API |
| `admin/dashboard/page.tsx` | Supprime tous les `localStorage.getItem('lumina_token')` |

### Pourquoi c'est critique
Un token en `localStorage` est lisible par tout script JS sur la page (extensions, dépendances NPM compromises, XSS). Un cookie `httpOnly` est totalement opaque au JavaScript — même si du code malveillant s'exécute sur la page, il ne peut pas lire le token.

---

## Section 2 — Structure des fichiers

### Objectif
Découper le fichier monolithique de 877 lignes en unités à responsabilité unique.

### Architecture cible

```
src/
├── app/admin/dashboard/
│   └── page.tsx                  (~100 lignes — orchestrateur)
│
├── components/admin/
│   ├── CandidatureCard.tsx       — carte grille (photo, hover, badge)
│   ├── DetailPanel.tsx           — panel droit (infos, actions)
│   ├── FloatingBar.tsx           — barre flottante (sélection, notifier)
│   ├── SessionComposer.tsx       — modale composer session
│   ├── Lightbox.tsx              — photo plein écran
│   ├── Toast.tsx                 — notification temporaire
│   └── DashboardFilters.tsx      — recherche + filtres + tri
│
├── hooks/admin/
│   ├── useCandidatures.ts        — fetch, refresh, CRUD API
│   └── useSelection.ts           — gestion IDs sélectionnés
│
└── types/
    └── candidature.ts            — interface Candidature + SessionForm + types
```

### Principe de découpage
Chaque fichier a **une seule raison de changer** (Single Responsibility).
Le `page.tsx` assemble sans contenir de logique métier.
Les hooks encapsulent toute la logique d'état et d'API.
Les composants sont purement présentationnels sauf quand nécessaire.

### Règle de nommage
Chaque fichier commence par un commentaire expliquant son rôle :
```tsx
// CandidatureCard — carte individuelle dans la grille du dashboard.
// Affiche photo profil/body (hover), badges, et expose onToggle + onViewDetail.
// Ne contient aucune logique API ni état global.
```

---

## Section 3 — Améliorations UX & Code

### 3A — Qualité du code

| Problème | Fix |
|---|---|
| `filtered` recalculé à chaque render | `useMemo()` sur filtre + tri |
| `calcAge()` recalculé pour chaque card | Calculé une fois dans `useCandidatures` |
| `transition: all` implicite | `transition-property: color, opacity, transform` explicite |
| Inline styles massivement répétés | Variables CSS réutilisées, classes Tailwind cohérentes |

### 3B — UX & interactions

| Problème | Fix |
|---|---|
| Boutons < 40px hit area | Padding minimum 40×40px |
| Compteurs sans `tabular-nums` | `font-variant-numeric: tabular-nums` partout |
| Toast sans animation | Fade + `translateY(-4px)` entrée, fade sortie |
| Lightbox sans transition | Fade-in ouverture, fade-out fermeture |
| Panel détail sans transition | Slide-in depuis la droite (`translateX(100%) → 0`) |
| Pas de `active:scale` sur CTA | `active:scale-[0.96]` pour feedback tactile |
| État vide générique | Message contextuel selon filtre actif |

### 3C — Sécurité complémentaire

| Problème | Fix |
|---|---|
| Pas de timeout d'inactivité | Déconnexion auto après 30 min sans action |
| Aucune validation réponses API | Vérification structure JSON avant usage |
| Rollback UI absent si DELETE échoue | Restaurer la candidature dans l'état si `res.ok === false` |
| Export CSV sans limite | Avertissement si > 500 candidatures |

---

## Ordre d'implémentation

1. **Section 1** — Sécurité cookies httpOnly (toutes les routes API + login + dashboard)
2. **Section 2** — Découpage fichiers (types → hooks → composants → page)
3. **Section 3A** — Qualité code (useMemo, calcAge, transitions)
4. **Section 3B** — UX interactions (hit areas, tabular-nums, animations)
5. **Section 3C** — Sécurité complémentaire (timeout, validation, rollback)

Chaque étape laisse le site en état **fonctionnel et déployable**.
