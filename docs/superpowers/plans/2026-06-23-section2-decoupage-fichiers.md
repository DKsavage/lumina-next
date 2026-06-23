# Section 2 — Découpage du dashboard (877 lignes → modules)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

**Goal:** Découper `dashboard/page.tsx` (877 lignes) en unités à responsabilité unique.

**Architecture:** types → hooks → composants → page orchestrateur (~100 lignes).

**Tech Stack:** Next.js 15 · TypeScript strict · Tailwind CSS v4

## Ordre d'exécution (dépendances)

1. `types/candidature.ts` — base de tout
2. `hooks/admin/useSelection.ts` — consomme les types
3. `hooks/admin/useCandidatures.ts` — consomme les types
4. `components/admin/Lightbox.tsx` — aucune dépendance
5. `components/admin/Toast.tsx` — aucune dépendance
6. `components/admin/CandidatureCard.tsx` — consomme Candidature
7. `components/admin/DashboardFilters.tsx` — consomme SortKey
8. `components/admin/SessionComposer.tsx` — consomme SessionForm
9. `components/admin/DetailPanel.tsx` — consomme Candidature + useSelection
10. `app/admin/dashboard/page.tsx` — orchestre tout, supprime le code extrait
