# Graph Report - .  (2026-06-15)

## Corpus Check
- 8 files · ~21,940 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 305 nodes · 394 edges · 23 communities (15 shown, 8 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Formulaire Multi-étapes|Formulaire Multi-étapes]]
- [[_COMMUNITY_Layout & Config App|Layout & Config App]]
- [[_COMMUNITY_API Admin & Auth|API Admin & Auth]]
- [[_COMMUNITY_Dépendances NPM|Dépendances NPM]]
- [[_COMMUNITY_Soumission & Compression|Soumission & Compression]]
- [[_COMMUNITY_Config shadcnUI|Config shadcn/UI]]
- [[_COMMUNITY_Animations & Sections|Animations & Sections]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Architecture CLAUDE|Architecture CLAUDE.md]]
- [[_COMMUNITY_Composants Partagés Form|Composants Partagés Form]]
- [[_COMMUNITY_Documentation Projet|Documentation Projet]]
- [[_COMMUNITY_Tests E2E Playwright|Tests E2E Playwright]]
- [[_COMMUNITY_Page Hero & Split|Page Hero & Split]]
- [[_COMMUNITY_Auth Admin OTP|Auth Admin OTP]]
- [[_COMMUNITY_Permissions Claude|Permissions Claude]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Assets Statiques|Assets Statiques]]
- [[_COMMUNITY_Assets Statiques|Assets Statiques]]
- [[_COMMUNITY_Assets Statiques|Assets Statiques]]
- [[_COMMUNITY_Assets Statiques|Assets Statiques]]
- [[_COMMUNITY_Assets Statiques|Assets Statiques]]
- [[_COMMUNITY_Select UI|Select UI]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 23 edges
2. `compilerOptions` - 16 edges
3. `src/app/api/submit/route.ts — POST candidature handler` - 11 edges
4. `Mockup Option 2 (Slideshow + Bottom Sheet)` - 10 edges
5. `Compression Image Automatique (Option C)` - 8 edges
6. `CandidatureForm.tsx — multi-step form orchestrator` - 8 edges
7. `POST()` - 7 edges
8. `Mockup Option 4 (Split + Mosaique)` - 7 edges
9. `tailwind` - 6 edges
10. `aliases` - 6 edges

## Surprising Connections (you probably didn't know these)
- `3-Step Candidature Form (Photos/Profil/Mesures)` --semantically_similar_to--> `CandidatureForm Multi-step`  [INFERRED] [semantically similar]
  docs/mockup-option2.html → CLAUDE.md
- `Split 55/45 Layout` --semantically_similar_to--> `HeroSplit Layout 48/52`  [INFERRED] [semantically similar]
  docs/mockup-option4.html → CLAUDE.md
- `MAX_PHOTO_BYTES = 1.5 MB server-side photo size limit` --conceptually_related_to--> `Compression Image Automatique (Option C)`  [INFERRED]
  src/app/api/submit/route.ts → CLAUDE.md
- `handleFile — async compression + preview handler` --implements--> `Compression Image Automatique (Option C)`  [INFERRED]
  src/components/form/StepPhotos.tsx → CLAUDE.md
- `SUPABASE_SERVICE_KEY — server-only, never NEXT_PUBLIC_` --rationale_for--> `src/app/api/submit/route.ts — POST candidature handler`  [EXTRACTED]
  CLAUDE.md → src/app/api/submit/route.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Client-side image compression flow (Option C)** — form_stepphotos_handlefile, package_browser_image_compression, claude_image_compression, claude_server_size_limit, concept_compress_threshold, concept_heic_support, claude_web_worker_rationale, form_stepphotos_compressing_state [EXTRACTED 1.00]
- **4-step form pipeline: StepPhotos > StepProfil > StepMesures > StepDisponibilite > API submit** — candidature_form_tsx, form_stepphotos, step_mesures_tsx, api_submit_route, concept_formdata_type [EXTRACTED 1.00]
- **Anti-abuse pipeline: honeypot + rate-limit + reCAPTCHA v3** — api_submit_route, concept_honeypot, concept_rate_limit, concept_recaptcha_v3 [EXTRACTED 1.00]
- **Supabase write path: photo upload to storage + DB insert candidatures** — api_submit_route, concept_supabase_storage, concept_supabase_db, concept_supabase_migration_june2026 [EXTRACTED 1.00]
- **Shared form UI components exported from StepPhotos** — form_stepphotos, concept_field_component, concept_cta_button, concept_back_button, step_mesures_tsx [EXTRACTED 1.00]

## Communities (23 total, 8 thin omitted)

### Community 0 - "Formulaire Multi-étapes"
Cohesion: 0.08
Nodes (27): URL.createObjectURL() + revokeObjectURL() — local photo preview, EASE_IN, EASE_OUT, EMPTY, FormData, STEPS, VARIANTS, EASE (+19 more)

### Community 1 - "Layout & Config App"
Cohesion: 0.11
Nodes (25): cormorant, geist, metadata, montserrat, viewport, RootLayout, cn(), Home Page (+17 more)

### Community 2 - "API Admin & Auth"
Cohesion: 0.10
Nodes (26): GET(), verifyToken(), Supabase candidatures table, Candidature, DashboardPage(), defaultSession, Group, SessionForm (+18 more)

### Community 3 - "Dépendances NPM"
Cohesion: 0.07
Nodes (26): dependencies, @base-ui/react, class-variance-authority, clsx, framer-motion, lucide-react, next, react (+18 more)

### Community 4 - "Soumission & Compression"
Cohesion: 0.13
Nodes (22): src/app/api/submit/route.ts — POST candidature handler, browser-image-compression (Web Worker), Compression Image Automatique (Option C), CLAUDE.md — project instructions and architecture decisions, MAX_PHOTO_BYTES = 1.5 MB server-side photo size limit, StepPhotos.tsx, browser-image-compression with useWebWorker:true — non-blocking compression, COMPRESS_THRESHOLD = 1 MB — client-side trigger for compression (+14 more)

### Community 5 - "Config shadcn/UI"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "Animations & Sections"
Cohesion: 0.10
Nodes (16): Stagger scroll-reveal animation pattern, CRITERIA, EASE, item, list, container, EASE, photo (+8 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Architecture CLAUDE.md"
Cohesion: 0.16
Nodes (19): CandidatureForm Multi-step, Couture Blanche (Direction Artistique Mockup D), FileReader.readAsDataURL Serialization, HeroSplit Layout 48/52, Ken Burns Animation, PhotoSlideshow (Ken Burns 5 slides), SVG Grain Texture (fractalNoise), Mockup Option 2 (Slideshow + Bottom Sheet) (+11 more)

### Community 9 - "Composants Partagés Form"
Cohesion: 0.15
Nodes (15): CandidatureForm.tsx — multi-step form orchestrator, BackButton — shared navigation back button, FileReader.readAsDataURL() — base64 serialization for JSON API, CtaButton — shared button with shake animation and loading spinner, E2E test — verifies .up-ring.optimizing CSS class during compression, Field — shared form field component (inline/asGroup modes), FormData — TypeScript type for all 4 form steps, VARIANTS — vertical AnimatePresence transitions (editorial magazine reveal) (+7 more)

### Community 10 - "Documentation Projet"
Cohesion: 0.18
Nodes (13): Next.js Breaking Changes Notice, Supabase Table candidatures, Lumina Photography Migration Project, Next.js 15 (App Router), Rate Limit 60s par IP, reCAPTCHA v3 Anti-bot, Resend Email Service, Stack Technique Lumina-Next (+5 more)

### Community 11 - "Tests E2E Playwright"
Cohesion: 0.15
Nodes (11): BIG, btn2, btn3, continueBtn, expChip, inputs, SMALL, step2Inputs (+3 more)

### Community 12 - "Page Hero & Split"
Cohesion: 0.29
Nodes (4): SLIDES, Props, SLIDES, Ken Burns on container, never on next/image

### Community 13 - "Auth Admin OTP"
Cohesion: 0.29
Nodes (4): AdminLoginPage(), POST(), POST(), POST()

## Knowledge Gaps
- **141 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Dépendances NPM` to `Soumission & Compression`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `browser-image-compression ^2.0.2` connect `Soumission & Compression` to `Composants Partagés Form`, `Dépendances NPM`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Compression Image Automatique (Option C)` connect `Soumission & Compression` to `Formulaire Multi-étapes`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Mockup Option 2 (Slideshow + Bottom Sheet)` (e.g. with `Couture Blanche (Direction Artistique Mockup D)` and `Mockup Option 4 (Split + Mosaique)`) actually correct?**
  _`Mockup Option 2 (Slideshow + Bottom Sheet)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Formulaire Multi-étapes` be split into smaller, more focused modules?**
  _Cohesion score 0.07926829268292683 - nodes in this community are weakly interconnected._
- **Should `Layout & Config App` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._