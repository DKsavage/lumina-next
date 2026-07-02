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

## Hors scope

- Portfolio photos par modèle
- Intégration Google Drive
- Pipeline complet (present/absent/paid)
- Sessions multi-jours
