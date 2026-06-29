# Dashboard Lumina — Spec Design

**Date :** 2026-06-26  
**Statut :** Validé — prêt pour implémentation  
**Scope :** Refonte complète du dashboard admin (`/admin/dashboard`, `/admin/sessions`)

---

## 1. Contexte & problèmes résolus

| Problème actuel | Solution retenue |
|---|---|
| Filtres trop nombreux, trop petits | 5 chips horizontaux + drawer "Filtres avancés" |
| Pas responsive mobile | Architecture mobile-first, bottom nav |
| Tout trop petit | Photos plus hautes, typographie Cormorant/Montserrat, respiration max |
| Animations de slide peu élégantes | Spring physics `cubic-bezier(0.32,0.72,0,1)`, fade-up staggeré |
| Cards qui s'étirent quand panel ouvert | Cards à largeur fixe, grille 3→2 colonnes sans étirement |
| Sidebar noire longue sur desktop | Pill flottante pleine largeur |

---

## 2. Direction artistique

Hérite de l'identité existante sans la modifier :

- **Fond :** `#F7F3EE` (cream)
- **Encre :** `#1A1410`
- **Rouge :** `#8B0020`
- **Or Ambassadeur :** `#C4973A`
- **Display :** Cormorant Garamond 300/400 italic
- **UI :** Montserrat 200/300/500
- **Grain overlay :** `position:fixed`, `opacity:.028`, `pointer-events:none` — feeling papier photographique
- **Ombres :** courtes et serrées — `0 1px 3px rgba(26,20,16,.07), 0 2px 6px rgba(26,20,16,.04)` — jamais de trainée longue
- **Motion :** `cubic-bezier(0.32,0.72,0,1)` partout — jamais `ease-in-out` ni `linear`

---

## 3. Navigation

### Desktop — Pill flottante

```
margin: .8rem .8rem 0
background: #1A1410 (ink)
border-radius: 100px
height: 40px
```

Structure gauche → droite :
1. **Logo** — "Lumina" en Cormorant Garamond italic
2. **Séparateur** — 1px vertical `rgba(255,255,255,.1)`
3. **Liens** — Modèles · Sessions · Factures — pill active `rgba(255,255,255,.11)`
4. **Cloche** — icône avec badge rouge compteur nouvelles candidatures
5. **CTA "Session"** — pill rouge avec icône `+` en cercle sombre imbriqué

Pas de sidebar. La pill se détache du bord, aucun élément collé au viewport.

### Mobile — Bottom nav

```
background: #1A1410
border-radius: 1.25rem (détachée, margin horizontal)
height: 48px
```

5 zones : Grille · Sessions · **FAB rouge central** · Profil modèle · Factures

- **FAB** : `width:38px, height:38px, border-radius:50%`, `background:#8B0020`
- `box-shadow: 0 2px 14px rgba(139,0,32,.4), 0 1px 0 rgba(255,255,255,.2) inset`
- Gradient fade cream en dessous de la barre pour détachement visuel

---

## 4. Architecture des cards

### Double-bezel (toutes les cards)

```
Outer shell:
  background: #EDE7DC (cream-deep)
  border: 1px solid rgba(26,20,16,.07)
  border-radius: 1.1rem
  padding: 3px
  box-shadow: 0 1px 0 rgba(255,255,255,.65) inset,
              0 1px 3px rgba(26,20,16,.07),
              0 2px 6px rgba(26,20,16,.04)

Inner core:
  background: #fff
  border-radius: calc(1.1rem - 3px)
  box-shadow: 0 1px 0 rgba(255,255,255,.9) inset
```

### Info visible sans clic (Option B validée)

- Nom — Cormorant Garamond 400, ~0.9rem
- Sous-titre — taille cm · genre · ville — Montserrat 300, 0.4rem, uppercase, muted
- **Point disponibilité** — dot 5px : vert `#2E7D32` = disponible, jaune `#F59E0B` = à confirmer
- **Tags métier** — pills 0.38rem : Editorial, Runway, Pub, Catalog — rouge-light ou neutral
- Photo : hauteur minimum 110px desktop, aspect-ratio 3/4 en CSS (jamais d'étirement)

### Badge tier (position: absolute, top-right photo)

| Tier | Style |
|---|---|
| Nouveau | `rgba(247,243,238,.84)` fond cream, text ink |
| Platine | `rgba(139,0,32,.88)` rouge, text blanc |
| Or | `rgba(139,0,32,.88)` rouge, text blanc |
| Ambassadeur | Voir section dédiée |

### Hover state

```css
transform: translateY(-2px)
box-shadow: 0 3px 8px rgba(26,20,16,.09), 0 1px 3px rgba(26,20,16,.05)
transition: transform .35s cubic-bezier(0.32,0.72,0,1),
            box-shadow .35s cubic-bezier(0.32,0.72,0,1)
```

---

## 5. Tier Ambassadeur

Card entièrement sombre, accents or. Visuellement rupture dans la grille.

```
Outer shell:
  background: #1A1410 (ink)
  border: 1px solid rgba(196,151,58,.3)
  box-shadow: 0 1px 0 rgba(255,255,255,.06) inset,
              0 2px 8px rgba(26,20,16,.18),
              0 0 0 1px rgba(196,151,58,.12)

Inner core:
  background: #1A1410
```

**Badge** : `background: linear-gradient(90deg, #C4973A, #E8C97A)`, text `#1A1410`, label "✦ Ambassadeur"

**Footer** :
- `border-top: 1px solid rgba(196,151,58,.18)`
- Ligne or : `::before` absolue, `background: linear-gradient(to right, transparent, #C4973A, transparent)`, `opacity:.45`
- Nom en `rgba(247,243,238,.95)`, meta en `rgba(155,143,132,.65)`
- Tag gold : `background: rgba(196,151,58,.1)`, `color: #C4973A`, `border: 1px solid rgba(196,151,58,.28)`

**Select dot** : gold au lieu de rouge — `background: #C4973A`

---

## 6. KPIs

Bande horizontale unifiée, une seule carte avec séparateurs internes (pas 4 boîtes séparées).

```
background: #fff
border: 1px solid rgba(26,20,16,.07)
border-radius: .85rem
display: flex
```

Chaque cellule :
- **Eyebrow** — 0.38rem uppercase muted
- **Chiffre** — Cormorant Garamond 300, 1.8rem, `line-height:1`
- Cellule "Nouvelles" : `background: rgba(139,0,32,.03)`, chiffre en `#8B0020`, trait rouge 2px top
- Cellule "Nouvelles" : tendance `↑ +3 aujourd'hui` en vert

Séparateurs internes : `::before` 1px vertical, `top:.5rem bottom:.5rem`, `rgba(26,20,16,.07)`

---

## 7. Barre de recherche + Filtres

### Search bar — double-bezel

```
Outer: background:#fff, border-radius:1rem, border:1px solid rgba(26,20,16,.12)
Inner: background:var(--cream), border-radius:calc(1rem - 3px)
       box-shadow: 0 1px 2px rgba(26,20,16,.05) inset
```

Contenu : icône loupe (SVG léger) · placeholder "Rechercher, filtrer, naviguer…" · badge `⌘K`

### Chips filtres

Placés juste sous la search, scrollables horizontalement sur mobile.

Visibles par défaut (dans l'ordre) :
1. **Tous (N)** — chip ink actif
2. **● Sélect. (N)** — chip rouge quand des sélections existent
3. Séparateur 1px
4. **Femmes** · **Hommes** · **Montréal** · **Platine**
5. Séparateur 1px
6. **+ Filtres avancés** — border dashed, ouvre un drawer

Drawer "Filtres avancés" : slide-up depuis le bas (mobile) ou dropdown (desktop). Contient : taille min/max, disponibilité, expérience, tier, tag, instagram, ville libre, tri.

---

## 8. Grille principale

### Panel fermé
- Desktop : 3 colonnes `repeat(3, 1fr)`, gap `.5rem`
- Mobile : liste verticale (cards horizontales)
- Bento asymétrique : cards Ambassadeur en `grid-row: span 2` pour briser la monotonie — **uniquement quand le panel est fermé**

### Panel ouvert — largeur fixe (Option B)
- La grille passe de 3 → 2 colonnes
- **Les cards ont une largeur fixe** — elles ne s'étirent jamais
- Implémentation : `grid-template-columns: repeat(2, minmax(0, 200px))` — les cards sont cappées à 200px, l'espace restant reste vide
- Le bento asymétrique (`grid-row: span 2`) est désactivé quand le panel est ouvert — grille uniforme 2 colonnes uniquement
- Transition : conteneur gauche passe à `max-width: 420px` avec spring, panel slide depuis la droite simultanément

### Scroll infini
- `loadMore()` au scroll bottom (hook `useCandidatures` existant)
- Skeleton loaders pendant le chargement (voir section 11)

---

## 9. Panneau détail modèle

### Layout

```
Slide depuis la droite : translateX(20px) → translateX(0), opacity 0→1
Duration: 450ms, cubic-bezier(0.32,0.72,0,1)
Fermeture : translateX(20px) + opacity 0, 250ms
```

Double-bezel identique aux cards :
```
Outer: cream-deep, border, border-radius:1.25rem, padding:4px
Inner: #fff, border-radius:calc(1.25rem - 4px)
```

### Structure interne (haut → bas)

**1. Photo zone**
- Hauteur 160px desktop / 200px mobile
- Gradient overlay bas `rgba(10,8,6,.55)` → transparent
- Flèches `‹ ›` (prev/next modèle) : `position:absolute`, `top:50%`, cercles `rgba(247,243,238,.18)`
- Dots navigation photo (profil / body) : bas-centre
- Bouton `✕` fermeture : top-right
- Badge tier (Ambassadeur : gradient or en bas-gauche)

**2. Header identité**
- Nom : Cormorant Garamond 400, 1.1rem
- Sous-titre : taille · genre · ville · âge
- Pills disponibilité + tags

**3. Tab bar**
- 3 tabs : **Infos** · **Mesures** · **Historique sessions**
- Tab active : `color: ink`, underline 1.5px rouge `bottom:0`

**4. Contenu tab Infos**
- Grid 3 colonnes : poitrine / taille / hanches
- Grid 2 colonnes : pointure / yeux
- Note interne éditable inline (crayon `✏` au hover du label)
- Instagram — lien cliquable avec flèche `↗`

**5. Actions sticky (toujours visibles)**
```
✓ Sélect. [rouge, primary] | + Session | ✏ [icon] | ⋯ [icon]
height: 26px chacun, border-radius: 100px
padding: .45rem .65rem sticky en bas, border-top
```

### Navigation clavier
- `←` `→` : modèle précédent/suivant (met à jour le panel en cross-fade 200ms)
- `↑` `↓` : même comportement
- `Esc` : ferme le panel
- Hint affiché discrètement sous la grille quand panel est ouvert

---

## 10. Barre de sélection flottante

Apparaît quand ≥ 2 cards sélectionnées. Disparaît si désélection totale.

### Animation
```css
/* Apparition */
from: opacity:0, transform: translateY(16px) scale(.97)
to:   opacity:1, transform: translateY(0) scale(1)
duration: 450ms, cubic-bezier(0.32,0.72,0,1)

/* Disparition */
from: opacity:1, transform: translateY(0) scale(1)
to:   opacity:0, transform: translateY(16px) scale(.97)
duration: 250ms
```

### Structure

```
background: #1A1410 (ink)
border-radius: 1.1rem
height: 52px
position: sticky (desktop) / fixed bottom (mobile, au-dessus bottom nav)
box-shadow: 0 -1px 0 rgba(255,255,255,.07) inset,
            0 8px 28px rgba(26,20,16,.22)
```

Gauche → droite :
1. **Thumbnails empilés** — photos des modèles sélectionnés, `margin-right:-8px`, `z-index` décroissant, `border:2px solid ink`
2. **Séparateur** 1px `rgba(255,255,255,.12)`
3. **Compteur** — chiffre en Cormorant Garamond 1.3rem + label "sélectionnées" 0.38rem muted
4. **Séparateur**
5. **Actions** :
   - "+ Session" — rouge primary avec flèche `›` imbriquée
   - "✉ Notifier" — secondary `rgba(255,255,255,.08)`
   - "⊘ Archiver" — secondary
6. **Dismiss `✕`** — cercle `rgba(255,255,255,.07)`, margin-left:auto

Mobile : swipe down pour dismiss.

---

## 11. Skeleton loaders

Remplacent le spinner générique au chargement initial et au `loadMore`.

```css
@keyframes shimmer {
  from { background-position: -300px 0 }
  to   { background-position:  300px 0 }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #EDE7DC 25%,
    rgba(237,231,220,.6) 50%,
    #EDE7DC 75%
  );
  background-size: 600px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 3px;
}
```

Structure skeleton card : photo zone + 4 lignes footer (nom, meta, dispo, tags).

---

## 12. Mobile — spécificités

- `min-height: 100dvh` (jamais `100vh` — iOS Safari viewport jump)
- Cards horizontales en liste : thumbnail 36×46px + info colonne + dot dispo + flèche `›`
- Card Ambassadeur mobile : fond ink, thumb avec bordure or, tag gold "✦ Ambass."
- Barre de sélection : `position:fixed`, `bottom: calc(48px + 1rem)` (au-dessus bottom nav)
- Filtres avancés : drawer bottom sheet, `border-radius: 1.25rem 1.25rem 0 0`
- Touch targets : minimum 44×44px sur tous les éléments interactifs

---

## 13. Composants à créer / modifier

| Composant | Action | Notes |
|---|---|---|
| `DashboardFilters.tsx` | Refonte complète | Chips + drawer, supprimer les ~15 props individuels |
| `CandidatureCard.tsx` | Refonte | Double-bezel, info B, Ambassadeur variant |
| `DetailPanel.tsx` | Refonte | Slide-in, tabs, photo carousel, actions sticky |
| `FloatingBar.tsx` | Refonte | Thumbnails empilés, spring animation |
| `dashboard/page.tsx` | Adapter layout | Grille fixe quand panel ouvert, skeleton |
| `globals.css` | Ajouter | Variables `--spring`, `--gold`, skeleton keyframe, grain overlay |
| Nouveau : `SkeletonCard.tsx` | Créer | Shimmer loader |
| Nouveau : `KpiStrip.tsx` | Créer | Bande unifiée 4 cellules |

---

## 14. Décisions complémentaires

### Tri
Chip dédié dans la barre de chips, toujours visible. Format : `Tri : Date ↓` — clic = cycle entre les 4 options (Date, Nom, Taille, Âge) avec indicateur `↑`/`↓`. Chip style `.chip.off` au repos, `.chip.on` quand tri non-default actif.

### État de sélection d'une card (Option B)
```css
/* Outer shell sélectionné */
border-color: var(--rouge);
box-shadow: 0 1px 0 rgba(255,255,255,.65) inset,
            0 0 0 2.5px rgba(139,0,32,.2),
            0 1px 3px rgba(26,20,16,.07);

/* Inner core */
background: rgba(139,0,32,.025);
```
Dot `✓` top-left : `background: var(--rouge)`, `border: 1.5px solid #fff`, `box-shadow: 0 2px 6px rgba(139,0,32,.35)`

Transition sur border et background : `200ms cubic-bezier(0.32,0.72,0,1)`.

Pour les cards Ambassadeur sélectionnées : dot gold `#C4973A` au lieu de rouge.

### État vide — aucun résultat (Option A)
Affiché quand `filtered.length === 0` et `hasActiveFilters === true`.

Structure centrée verticalement dans la zone grille :
1. **Illustration** — mini-grille 2×2 de cards fantômes (fond `var(--border)`, opacity décroissante)
2. **Headline** — "Aucun modèle trouvé" en Cormorant Garamond 300 italic
3. **Filtres actifs** — pills `rouge-light` avec `✕` pour retrait individuel (appelle le callback de reset du filtre concerné)
4. **Sous-titre** — "Essaie d'élargir les critères ou réinitialise les filtres" Montserrat 300
5. **CTA** — pill rouge "Réinitialiser les filtres" → appelle `onResetFilters()`

Si `filtered.length === 0` et `!hasActiveFilters` (liste vide sans filtre = base vide) : message différent "Aucune candidature pour l'instant."

---

## 16. Ce qui ne change pas

- Hooks `useCandidatures`, `useSelection` — logique métier intacte
- Toutes les routes API — zéro modification backend
- Composants `SessionComposer`, `SessionEditPanel`, `SessionStatusPanel`, `Toast`, `Lightbox` — hors scope
- Logique de filtrage/tri dans `page.tsx` — conservée telle quelle
- Auth OTP, reCAPTCHA, formulaire d'inscription — hors scope
