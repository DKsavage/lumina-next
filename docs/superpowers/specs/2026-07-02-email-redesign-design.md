# Email Redesign — Design Spec
**Date:** 2026-07-02
**Projet:** Lumina / Flawa Models
**Statut:** Approuvé

---

## Contexte

Les 4 templates d'emails (send-session, remind, confirm, select) sont fonctionnels mais visuellement génériques. Fond gris `#f3f3f3`, barre rouge 4px, Arial partout, boutons côte à côte non adaptés au mobile. Les modèles ouvrent ces emails principalement sur **mobile**.

---

## Direction retenue : Lumina Editorial

Cohérence visuelle avec le dashboard (`#F7F3EE`, `#8B0020`, Georgia serif pour les accents, angles droits). Chaque email ressemble à un brief de shooting — editorial et distinctif.

---

## Palette

| Rôle | Valeur |
|---|---|
| Fond extérieur | `#F7F3EE` |
| Container | `#FFFFFF` |
| Rouge principal | `#8B0020` |
| Texte principal | `#0A0A0A` |
| Texte secondaire | `#6B6B6B` |
| Séparateur | `1px solid rgba(139,0,32,0.12)` |
| Fond footer / blocs | `#F7F3EE` |

---

## Typographie (contraintes email — polices système uniquement)

| Rôle | Style |
|---|---|
| Signature brand (header/footer) | Georgia serif · 10–13px · uppercase · letter-spacing 0.22em |
| Titre projet (header) | Georgia serif · 26px · bold · blanc |
| Sous-titre header (type · date) | Arial · 13px · blanc 70% |
| Corps | Arial · 16px · `#0A0A0A` · line-height 1.8 |
| Labels de section | Georgia serif · 10px · uppercase · letter-spacing 0.2em · `#6B6B6B` |
| Notes secondaires | Arial · 13px · `#6B6B6B` · italic |

---

## Structure générale (une colonne)

```
┌─────────────────────────────────┐  ← fond #F7F3EE · padding 16px
│  ┌───────────────────────────┐  │
│  │  HEADER #8B0020           │  │
│  │  padding: 32px 24px       │  │
│  ├───────────────────────────┤  │
│  │  · EN ·  ───────────────  │  │  ← label langue + séparateur
│  │  BODY section EN          │  │
│  │  padding: 24px            │  │
│  ├───────────────────────────┤  │
│  │  · FR ·  ───────────────  │  │  ← séparateur bilingue
│  │  BODY section FR          │  │
│  │  padding: 24px            │  │
│  ├───────────────────────────┤  │
│  │  FOOTER fond #F7F3EE      │  │
│  │  padding: 24px            │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
  max-width: 600px · centré
```

---

## Header

```
┌───────────────────────────────────────┐
│  FLAWA MODELS                         │  ← 10px · Georgia · uppercase
│                                       │     letter-spacing 0.22em · blanc 70%
│  Projet Lumina Été                    │  ← Georgia 26px · bold · blanc
│  Photoshoot · 15 juillet 2026         │  ← Arial 13px · blanc 70%
└───────────────────────────────────────┘
  background: #8B0020 · padding: 32px 24px
```

**Variante rappels :** ligne supplémentaire sous le titre — `Rappel · dans 2 jours` en Arial 12px · blanc 60%.

---

## Boutons CTA — empilés verticaux, pleine largeur

```
┌───────────────────────────────────────┐
│  ██████████████████████████████████  │  ← Confirmer ma présence
│  background #8B0020 · blanc · 16px   │     padding: 16px · 100% width
│  bold · text-align: center           │     ~52px height · aucun border-radius
└───────────────────────────────────────┘
gap: 10px
┌───────────────────────────────────────┐
│  Je ne serai pas disponible          │  ← fond blanc
│  border: 1px solid #E0E0E0           │     padding: 14px · 100% width
│  #6B6B6B · 14px · text-align:center  │     aucun border-radius
└───────────────────────────────────────┘
```

- Aucun `border-radius` — cohérent avec le dashboard Lumina
- Emails à un seul CTA (facture, remerciement) : uniquement le bouton rouge pleine largeur

---

## Blocs d'info (Lieu, Planning, Préparation, Look…)

```
LIEU                              ← Georgia 10px · uppercase · #6B6B6B
──────────────────────────────    ← 1px solid rgba(139,0,32,0.12)
2165 Avenue Charlemagne
Montréal, QC

PLANNING
──────────────────────────────
Groupe A — 09h00 → ~11h00 ← VOTRE CALL TIME   ← bold · #8B0020
Groupe B — 13h00 → ~15h00
```

- Label + ligne fine remplace les `border-left` et fonds gris actuels
- 24px de gap entre chaque bloc
- Groupe du modèle : bold + `#8B0020` — impossible de rater son call time
- Blocs prep/look : fond `#F7F3EE` + padding 12px 16px (sans `border-left`)

---

## Séparateur bilingue EN/FR

```
                    ·  FR  ·
        ────────────────────────────
```
- `· EN ·` et `· FR ·` en Georgia 9px · uppercase · `#8B0020` · centré
- Ligne `1px solid rgba(139,0,32,0.12)`
- Padding 32px vertical autour

---

## Footer

```
┌───────────────────────────────────────┐
│  FLAWA MODELS                         │  ← Georgia 13px · #8B0020 · uppercase
│  casting@luminamodels.ca              │  ← Arial 12px · #6B6B6B
│  luminamodels.ca · Montréal           │  ← Arial 12px · #6B6B6B
└───────────────────────────────────────┘
  fond #F7F3EE · padding 24px
  pas de bordure supérieure — transition crème/blanc suffit
```

---

## Architecture — helper partagé

**Problème actuel :** chaque template duplique la même structure HTML wrapper (DOCTYPE, body, table extérieur, header, footer). Toute modification de design demande 4 fichiers.

**Solution :** extraire `buildEmailWrapper(opts)` dans `src/lib/email.ts` :

```ts
interface EmailWrapperOpts {
  projectName: string       // affiché dans le header
  typeLabel:   string       // ex. "Photoshoot · 15 juillet 2026"
  subLabel?:   string       // ex. "Rappel · dans 2 jours" (rappels uniquement)
  bodyEn:      string       // HTML section EN
  bodyFr:      string       // HTML section FR (vide string si email FR seulement)
  lang?:       'fr' | 'en' | 'both'  // défaut 'both'
}

export function buildEmailWrapper(opts: EmailWrapperOpts): string
```

**Templates qui utilisent `buildEmailWrapper` :**
| Fichier | Changement |
|---|---|
| `src/app/api/send-session/route.ts` | Remplace le template inline par `buildEmailWrapper` |
| `src/app/api/sessions/remind/route.ts` | Idem + `subLabel` pour le type de rappel |
| `src/app/api/confirm/route.ts` | Idem |
| `src/app/api/select/route.ts` | Idem |

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/lib/email.ts` | **Créer** — `buildEmailWrapper()` + helpers CSS inline réutilisables |
| `src/app/api/send-session/route.ts` | **Modifier** — utiliser `buildEmailWrapper`, garder `buildEmail()` |
| `src/app/api/sessions/remind/route.ts` | **Modifier** — utiliser `buildEmailWrapper` |
| `src/app/api/confirm/route.ts` | **Modifier** — utiliser `buildEmailWrapper` |
| `src/app/api/select/route.ts` | **Modifier** — utiliser `buildEmailWrapper` |

---

## Hors scope

- Polices web (Cormorant/Montserrat) — non supportées par les clients email
- Images/bannières — risque de blocage par défaut dans Gmail/Outlook
- Dark mode email — hors scope
- Nouveau contenu ou champs — uniquement le design
