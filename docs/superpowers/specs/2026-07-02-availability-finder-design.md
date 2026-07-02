# Availability Finder — Design Spec
**Date:** 2026-07-02  
**Projet:** Lumina / Flawa Models  
**Statut:** Approuvé

---

## Contexte

Lumina est une agence de casting qui recrute et gère des modèles pour des sessions photo (sponsor + studio + set design). Avant de contacter des modèles pour une session, l'admin doit manuellement vérifier leur disponibilité — information dispersée et non centralisée.

---

## Problème

Aucune interface ne permet de répondre à : **"Qui peut venir le 15 juillet ?"** avant de lancer le processus de sélection. L'admin doit parcourir les candidatures une à une.

---

## Sources de données disponibles

| Source | Type | Fiabilité |
|---|---|---|
| `candidatures.disponibilite` | Préférence de type (`Flexible`, `Jours de semaine`, `Weekends`, `Voyages OK`) | Soft — déclarée à l'inscription |
| `session_models.status = 'confirmed'` JOIN `sessions.date` | Conflit réel de booking | Hard — vérité terrain |

---

## Solution retenue : Option 3 — Intégration dans le SessionComposer

Le finder s'intègre dans le flux existant sans nouvelle page ni navigation supplémentaire. Le workflow manuel est **100% préservé** — toutes les additions sont optionnelles.

---

## API

### `GET /api/candidatures/available?date=YYYY-MM-DD`

**Logique de filtrage :**

1. Détecter si la date est un weekday (lundi–vendredi) ou weekend (samedi–dimanche)
2. Filtrer les candidatures avec `archived = false` par `disponibilite` :
   - Weekday → inclure `Flexible` + `Jours de semaine`
   - Weekend → inclure `Flexible` + `Weekends`
   - `Voyages OK` → toujours inclus quelle que soit la date
   - Candidature sans `disponibilite` renseignée → incluse par défaut (ne pas pénaliser un profil incomplet)
3. Exclure les modèles ayant `session_models.status = 'confirmed'` pour une session dont `sessions.date = date` (les statuts `pending` et `cancelled` ne bloquent pas)

**Réponse :**
```ts
{
  success: boolean
  data: Array<{
    id: string
    prenom: string
    nom: string
    genre: string | null
    taille: string | null
    tier: string | null
    disponibilite: string | null
  }>
}
```

**Edge cases :**
- Date invalide → `400`
- Aucun résultat → `[]` (pas d'erreur)
- Sessions sur plusieurs jours → non supporté (hors scope)

---

## UI — SessionComposer

### Tab "form" — badge sous le champ date

Dès que le champ `date` est rempli, un badge apparaît :
```
● 12 modèles disponibles ce jour  ↓ voir la liste
```
- Clic → panneau déroulant compact (max 6 lignes visibles, scroll interne)
- Chaque ligne : prénom + nom · genre · taille · tier chip
- Bouton `+` par ligne → ajoute le modèle à la sélection courante
- Badge absent si date non remplie

### Tab "assign" — section "Autres disponibles"

En bas du tab assign, section séparée **"Autres disponibles ce jour"** :
- Même liste filtrée, excluant les modèles déjà dans la session
- Permet d'enrichir la sélection sans retourner au dashboard

### Avertissement de conflit (non-bloquant)

Si un modèle déjà sélectionné manuellement est `confirmed` dans une autre session ce même jour → icône ⚠️ sur sa carte dans le tab assign. Pas de blocage, juste une alerte visuelle.

---

## UI — Dashboard (fallback pré-Composer)

Dans `DashboardFilters` existants : ajout d'un champ date **"Dispo le"**.  
- Filtre la liste principale de candidatures selon la même logique API
- Permet de vérifier les disponibilités avant même d'ouvrir le Composer
- Champ optionnel, sans valeur par défaut

---

## Ce qui ne change pas

- Le workflow de sélection manuelle via FloatingBar → inchangé
- La logique de création de session → inchangée
- Les tabs form/assign du Composer → structure préservée, ajouts seulement

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/app/api/candidatures/available/route.ts` | Créer — endpoint GET |
| `src/components/admin/SessionComposer.tsx` | Modifier — badge dispo + section assign |
| `src/components/admin/DashboardFilters.tsx` | Modifier — champ "Dispo le" |
| `src/app/admin/dashboard/page.tsx` | Modifier — passer le filtre date aux hooks |

---

---

## Design

### Principes appliqués (make-interfaces-feel-better)

| Composant | Principe | Décision |
|---|---|---|
| Badge dispo (nombre) | Tabular numbers | `font-variant-numeric: tabular-nums` — le chiffre change selon la date, zéro layout shift |
| Panneau déroulant | Shadow over border | `box-shadow` multicouche (0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.08)) — s'adapte au fond `#F7F3EE` |
| Panneau déroulant | Stagger enter | Chaque ligne : `delay = index × 40ms`, `translateY(6px) → 0` + `opacity 0 → 1`, spring bounce: 0 |
| Panneau déroulant | Exit subtil | `translateY(4px)` + `opacity → 0`, durée 150ms — la sortie est plus douce que l'entrée |
| AnimatePresence | Skip page load | `initial={false}` sur tous les AnimatePresence des nouveaux composants |
| Bouton "+" | Scale on press | `active:scale-[0.96] transition-transform` — feedback tactile sans exagération |
| Bouton "+" | Hit area | Minimum 40×40px — `p-2` autour de l'icône `size-4` |
| Icône ⚠️ conflit | Icon animation | `opacity 0→1` + `scale 0.25→1` + `blur 4px→0`, spring duration: 0.3, bounce: 0. SVG custom fourni (triangle, stroke-width 1.5, pas de fill) — voir section SVG ci-dessous |
| Border radius | Concentric | Panneau outer `rounded-xl` · lignes inner `rounded-lg` · chip tier `rounded-full` |
| Transitions | Pas de `transition: all` | `transition-property: opacity, transform` uniquement |

### Signature typographique (frontend-design)

Le badge disponibilité utilise les deux faces de Lumina en tension :

```
┌─────────────────────────────────────────┐
│  12  disponibles ce jour   ↓            │
│  ↑                                      │
│  Cormorant Garamond 300 italic, 1.1rem  │
│       ↑                                 │
│       Montserrat 200 uppercase, .45rem  │
└─────────────────────────────────────────┘
```

Ce n'est pas un badge admin générique — c'est un moment éditorial dans un outil opérationnel. Cohérent avec le AdminNav pill et les tier chips existants.

### Couleurs disponibilité

Lumina n'a pas de vert dans sa palette. Plutôt que d'en introduire un, on utilise :
- **Disponible** → `var(--ink)` à 60% opacity + dot `#6B7B5E` (sage discret, pas de vert criard)
- **Conflit ⚠️** → `#B45309` (amber chaud, lisible sur `#F7F3EE` sans casser la palette)
- **Fond panneau** → `#F7F3EE` avec `backdrop-filter: none` — même base que le reste du dashboard

### Responsive

| Viewport | Badge | Panneau | Section assign | Filtre "Dispo le" |
|---|---|---|---|---|
| Mobile (`< 640px`) | Full-width, texte centré | Slide up depuis le bas (bottom sheet), `max-h-60` | Section collapsible avec toggle | Dans `FiltersDrawer` existant |
| Desktop (`≥ 640px`) | Inline sous le champ date | Dropdown attaché au badge, `max-h-72` | Section fixe en bas du tab assign | Inline dans `DashboardFilters` |

### Icône conflit — SVG fourni

Sauvegarder dans `src/components/icons/WarningTriangle.tsx` comme composant React :
- `stroke` = `currentColor` (pas `#000000`) pour hériter de la couleur parente
- `width` / `height` via props avec défaut `16`
- Couleur d'utilisation : `#B45309` (amber chaud)

```svg
<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.0429 21H3.95705C2.41902 21 1.45658 19.3364 2.22324 18.0031L10.2662 4.01533C11.0352 2.67792 12.9648 2.67791 13.7338 4.01532L21.7768 18.0031C22.5434 19.3364 21.581 21 20.0429 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M12 9V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M12 17.01L12.01 16.9989" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### Micro-copie (frontend-design — écriture)

Voix active, sentence case, vocabulaire constant dans tout le flow :

| Élément | Texte |
|---|---|
| Badge avec résultats | `12 disponibles ce jour` |
| Badge zéro résultat | `Aucun modèle disponible ce jour` |
| Toggle fermé | `↓ voir` |
| Toggle ouvert | `↑ masquer` |
| Bouton ajouter | `+` (icône seule, aria-label: `Ajouter [prénom] à la session`) |
| Warning conflit | `Déjà confirmé·e ce jour` (tooltip au hover) |
| Section assign | `Autres disponibles` |
| État vide section assign | `Tous les modèles disponibles sont déjà dans la session` |
| Filtre dashboard | `Dispo le` (label court, consistent avec les autres filtres) |

---

## Hors scope

- Portfolio photos par modèle
- Intégration Google Drive
- Pipeline complet (present/absent/paid)
- Sessions multi-jours
