# Page admin /admin/factures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin page listing every invoice (facture) ever generated, grouped by session or by model, with a manual paid/sent/pending status, a real sequential invoice number, a persisted model address, and CSV/print export — replacing the dead `href: '#'` link in `AdminNav`.

**Architecture:** Extend the existing `session_models` table (one row already IS one invoice, tied 1:1 via `token`) with `invoice_status` and `invoice_number` columns, assigned by a Postgres trigger the first time `payment_amount` is set. Add `candidatures.adresse` as the single persisted address per model. Pure filter/group/CSV logic lives in `src/lib/factures.ts` so it's unit-testable with `node:test`, the same way `src/lib/email.ts` is tested today. The admin page is a single self-contained Client Component following the `src/app/admin/sessions/page.tsx` pattern (own nav, own state, no shared filter component) rather than the more decomposed dashboard pattern — there's no multi-page reuse need here.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase REST API (no SDK, `fetch` directly — matches every existing route), `node:test` for pure-function tests, Playwright for e2e, no new dependencies.

## Global Constraints

- TypeScript strict — `npx tsc --noEmit` must return 0 errors before any commit.
- `git add` targeted files only — never `git add .`.
- No `Co-Authored-By: Claude` in commit messages.
- `next/image` mandatory for any `<img>` — not applicable here, no images in this feature.
- `SUPABASE_SERVICE_KEY` server-side only, never `NEXT_PUBLIC_`.
- All new admin API routes call `verifyToken(request)` first and return `401` if it fails — matches every existing `/api/sessions/*`, `/api/candidatures/*` route.
- All Supabase access goes through `fetch` to `${SUPABASE_URL}/rest/v1/...` with `apikey`/`Authorization` headers — no new libraries.
- CSV export follows the exact convention in `src/app/admin/dashboard/page.tsx:136-154`: `sep=,\r\n` prefix, BOM, quoted+escaped fields, `\r\n` row separator — this guarantees real rows/columns, never one line.
- The database migration (`supabase-migration.sql`) is applied manually by the user in Supabase Studio's SQL editor — there is no local Supabase CLI/dev DB in this project, and no agent has credentials to run DDL against the live production project. Every task touching schema must say so explicitly and must not claim the migration ran.

---

### Task 1: Schema migration — invoice columns, address column, numbering trigger

**Files:**
- Modify: `supabase-migration.sql`
- Modify: `src/types/session.ts`
- Modify: `src/types/candidature.ts`

**Interfaces:**
- Produces: `SessionModel.invoice_status: 'pending' | 'sent' | 'paid'`, `SessionModel.invoice_number: string | null`, `SessionModel.model_nom: string | null`, `SessionModel.role: string`, `SessionModel.payment_amount: number | null` (all consumed by every later task touching `session_models`).
- Produces: `Candidature.adresse: string | null` (consumed by Task 3).

- [ ] **Step 1: Append the migration SQL**

Add to the end of `supabase-migration.sql` (this file already documents its own apply instructions at the top: "Appliquer dans Supabase Studio > SQL Editor" — follow that same convention):

```sql

-- Phase 15 — Page admin /admin/factures
-- Documente aussi 3 colonnes déjà présentes en prod mais absentes de ce fichier
-- (dérive de schéma constatée : ajoutées à la main avant cette migration).
alter table session_models add column if not exists model_nom       text;
alter table session_models add column if not exists role            text;
alter table session_models add column if not exists payment_amount  numeric;

-- Nouvelles colonnes pour le suivi de facturation
alter table session_models add column if not exists invoice_status  text default 'pending';
alter table session_models add column if not exists invoice_number  text unique;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_models_invoice_status_check'
  ) then
    alter table session_models add constraint session_models_invoice_status_check
      check (invoice_status in ('pending', 'sent', 'paid'));
  end if;
end $$;

-- Adresse du modèle — persistée une fois, réutilisée sur toutes ses factures
alter table candidatures add column if not exists adresse text;

-- Compteur de numérotation par année civile
create table if not exists invoice_counters (
  year         int primary key,
  next_number  int not null default 1
);

create or replace function assign_invoice_number() returns trigger as $$
declare
  yr int := extract(year from now());
  n  int;
begin
  if new.payment_amount is not null and old.payment_amount is null and new.invoice_number is null then
    insert into invoice_counters (year, next_number) values (yr, 2)
      on conflict (year) do update set next_number = invoice_counters.next_number + 1
      returning next_number - 1 into n;
    new.invoice_number := 'FLW-' || yr || '-' || lpad(n::text, 4, '0');
    new.invoice_status := 'sent';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists session_models_invoice_number on session_models;
create trigger session_models_invoice_number
  before update on session_models
  for each row execute function assign_invoice_number();
```

- [ ] **Step 2: Tell the user to run it manually**

This cannot be automated — there is no Supabase CLI project or local dev database here (confirmed: no `supabase/` directory, no `SUPABASE_ACCESS_TOKEN` in env). Print this exact instruction and wait for confirmation before continuing to any task that reads `invoice_status`/`invoice_number`/`adresse` at runtime:

> "Ouvre Supabase Studio → SQL Editor → colle le contenu ajouté à `supabase-migration.sql` (le bloc `Phase 15`) → Run. Dis-moi quand c'est fait."

- [ ] **Step 3: Update `SessionModel` type**

In `src/types/session.ts`, add to the `SessionModel` interface (after `created_at`):

```ts
  model_nom:                string | null
  role:                     string
  payment_amount:           number | null
  invoice_status:           'pending' | 'sent' | 'paid'
  invoice_number:           string | null
```

- [ ] **Step 4: Update `Candidature` type**

In `src/types/candidature.ts`, add after `photo_body_signed?`:

```ts
  adresse?:              string | null
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (existing `any`-typed Supabase REST responses aren't affected by adding optional/new interface fields).

- [ ] **Step 6: Commit**

```bash
git add supabase-migration.sql src/types/session.ts src/types/candidature.ts
git commit -m "feat: schema pour la facturation (statut, numero, adresse persistee)"
```

---

### Task 2: Pure logic module — filter, group, CSV (`src/lib/factures.ts`)

**Files:**
- Create: `src/lib/factures.ts`
- Test: `tests/pure.test.ts` (append)

**Interfaces:**
- Produces: `InvoiceStatus`, `InvoiceRow`, `InvoiceFilters`, `filterInvoices()`, `ModelGroup`, `groupByModel()`, `SessionGroupRow`, `groupBySession()`, `buildInvoiceCsv()` — all consumed by Task 3 (API route) and Task 6 (admin page CSV button).

- [ ] **Step 1: Write the failing tests**

Append to `tests/pure.test.ts` (this file already imports directly from `../src/lib/email.ts` with a relative path, which resolves fine under `node --experimental-strip-types --test` — only `@/` tsconfig aliases fail to resolve, so importing `../src/lib/factures.ts` the same way works):

```ts
import {
  filterInvoices, groupByModel, groupBySession, buildInvoiceCsv,
  type InvoiceRow,
} from '../src/lib/factures.ts'

const SAMPLE_ROWS: InvoiceRow[] = [
  {
    id: 'sm1', invoice_number: 'FLW-2026-0001', invoice_status: 'paid',
    token: 't1', role: 'Mannequin', model_prenom: 'Julie', model_nom: 'Tremblay',
    model_email: 'julie@example.com', payment_amount: 450,
    session_id: 's1', project: 'Campagne Été', date: '2026-06-12',
  },
  {
    id: 'sm2', invoice_number: 'FLW-2026-0002', invoice_status: 'sent',
    token: 't2', role: 'Mannequin', model_prenom: 'Marc', model_nom: 'Dubois',
    model_email: 'marc@example.com', payment_amount: 300,
    session_id: 's2', project: 'Shooting Produit', date: '2026-06-15',
  },
  {
    id: 'sm3', invoice_number: null, invoice_status: 'pending',
    token: 't3', role: 'Mannequin', model_prenom: 'Julie', model_nom: 'Tremblay',
    model_email: 'julie@example.com', payment_amount: 200,
    session_id: 's3', project: 'Lookbook Hiver', date: '2026-01-20',
  },
]

describe('filterInvoices', () => {
  test('sans filtre → retourne toutes les lignes', () => {
    assert.equal(filterInvoices(SAMPLE_ROWS, {}).length, 3)
  })

  test('filtre par statut', () => {
    const result = filterInvoices(SAMPLE_ROWS, { status: 'paid' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'sm1')
  })

  test('filtre par plage de dates (from)', () => {
    const result = filterInvoices(SAMPLE_ROWS, { from: '2026-06-01' })
    assert.equal(result.length, 2)
  })

  test('filtre par plage de dates (to)', () => {
    const result = filterInvoices(SAMPLE_ROWS, { to: '2026-02-01' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'sm3')
  })

  test('recherche texte sur le nom du modele', () => {
    const result = filterInvoices(SAMPLE_ROWS, { q: 'julie' })
    assert.equal(result.length, 2)
  })

  test('recherche texte sur le projet, insensible a la casse', () => {
    const result = filterInvoices(SAMPLE_ROWS, { q: 'PRODUIT' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'sm2')
  })

  test('recherche sans correspondance → tableau vide', () => {
    assert.equal(filterInvoices(SAMPLE_ROWS, { q: 'zzz' }).length, 0)
  })
})

describe('groupByModel', () => {
  test('regroupe par model_email', () => {
    const groups = groupByModel(SAMPLE_ROWS)
    assert.equal(groups.length, 2)
  })

  test('total_paid ne compte que les factures payees', () => {
    const groups = groupByModel(SAMPLE_ROWS)
    const julie = groups.find(g => g.model_email === 'julie@example.com')!
    assert.equal(julie.total_paid, 450)
    assert.equal(julie.invoices.length, 2)
  })

  test('modele sans facture payee → total_paid = 0', () => {
    const groups = groupByModel(SAMPLE_ROWS)
    const marc = groups.find(g => g.model_email === 'marc@example.com')!
    assert.equal(marc.total_paid, 0)
  })
})

describe('groupBySession', () => {
  test('regroupe par session_id', () => {
    const groups = groupBySession(SAMPLE_ROWS)
    assert.equal(groups.length, 3)
  })

  test('chaque groupe garde le projet et la date de la session', () => {
    const groups = groupBySession(SAMPLE_ROWS)
    const s1 = groups.find(g => g.session_id === 's1')!
    assert.equal(s1.project, 'Campagne Été')
    assert.equal(s1.date, '2026-06-12')
    assert.equal(s1.invoices.length, 1)
  })
})

describe('buildInvoiceCsv', () => {
  test('commence par la directive sep=, puis CRLF', () => {
    const csv = buildInvoiceCsv(SAMPLE_ROWS)
    assert.ok(csv.startsWith('sep=,\r\n'))
  })

  test('produit une ligne par facture, pas tout sur une seule ligne', () => {
    const csv = buildInvoiceCsv(SAMPLE_ROWS)
    const lines = csv.split('\r\n')
    // 1 ligne directive + 1 ligne headers + 3 lignes de données
    assert.equal(lines.length, 5)
  })

  test('les colonnes sont separees par des virgules, valeurs entre guillemets', () => {
    const csv = buildInvoiceCsv(SAMPLE_ROWS)
    const lines = csv.split('\r\n')
    assert.ok(lines[2].includes('"FLW-2026-0001"'))
    assert.ok(lines[2].includes('"paid"'))
    assert.ok(lines[2].includes('"julie@example.com"'))
  })

  test('echappe les guillemets internes', () => {
    const rows: InvoiceRow[] = [{ ...SAMPLE_ROWS[0], project: 'Shoot "Spécial"' }]
    const csv = buildInvoiceCsv(rows)
    assert.ok(csv.includes('""Spécial""'))
  })

  test('montant absent → cellule vide, pas "null"', () => {
    const rows: InvoiceRow[] = [{ ...SAMPLE_ROWS[0], payment_amount: null }]
    const csv = buildInvoiceCsv(rows)
    assert.ok(!csv.includes('null'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:pure`
Expected: FAIL — `Cannot find module '../src/lib/factures.ts'`

- [ ] **Step 3: Implement `src/lib/factures.ts`**

```ts
// factures.ts — logique pure de filtrage, regroupement et export CSV des factures.
// Séparée des routes API pour rester testable avec node:test (voir tests/pure.test.ts).
// Une "facture" = une ligne session_models dont payment_amount n'est pas null.

export type InvoiceStatus = 'pending' | 'sent' | 'paid'

export interface InvoiceRow {
  id:             string
  invoice_number: string | null
  invoice_status: InvoiceStatus
  token:          string
  role:           string
  model_prenom:   string
  model_nom:      string | null
  model_email:    string
  payment_amount: number | null
  session_id:     string
  project:        string
  date:           string // ISO "2026-06-12"
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  from?:   string // ISO date, inclusif
  to?:     string // ISO date, inclusif
  q?:      string // recherche nom modele ou projet, insensible a la casse
}

export function filterInvoices(rows: InvoiceRow[], filters: InvoiceFilters): InvoiceRow[] {
  return rows.filter(r => {
    if (filters.status && r.invoice_status !== filters.status) return false
    if (filters.from && r.date < filters.from) return false
    if (filters.to && r.date > filters.to) return false
    if (filters.q) {
      const q = filters.q.toLowerCase()
      const fullName = `${r.model_prenom} ${r.model_nom ?? ''}`.toLowerCase()
      if (!fullName.includes(q) && !r.project.toLowerCase().includes(q)) return false
    }
    return true
  })
}

export interface ModelGroup {
  model_email: string
  model_name:  string
  total_paid:  number
  invoices:    InvoiceRow[]
}

export function groupByModel(rows: InvoiceRow[]): ModelGroup[] {
  const map = new Map<string, ModelGroup>()
  for (const r of rows) {
    if (!map.has(r.model_email)) {
      map.set(r.model_email, {
        model_email: r.model_email,
        model_name:  `${r.model_prenom} ${r.model_nom ?? ''}`.trim(),
        total_paid:  0,
        invoices:    [],
      })
    }
    const group = map.get(r.model_email)!
    group.invoices.push(r)
    if (r.invoice_status === 'paid') group.total_paid += r.payment_amount ?? 0
  }
  return Array.from(map.values())
}

export interface SessionGroupRow {
  session_id: string
  project:    string
  date:       string
  invoices:   InvoiceRow[]
}

export function groupBySession(rows: InvoiceRow[]): SessionGroupRow[] {
  const map = new Map<string, SessionGroupRow>()
  for (const r of rows) {
    if (!map.has(r.session_id)) {
      map.set(r.session_id, { session_id: r.session_id, project: r.project, date: r.date, invoices: [] })
    }
    map.get(r.session_id)!.invoices.push(r)
  }
  return Array.from(map.values())
}

// Même convention que handleExportCSV (src/app/admin/dashboard/page.tsx) :
// directive sep=, pour Excel, valeurs entre guillemets échappées, CRLF entre lignes.
export function buildInvoiceCsv(rows: InvoiceRow[]): string {
  const headers = ['Numero facture', 'Statut', 'Modele', 'Email', 'Projet', 'Date session', 'Montant', 'Role']
  const dataRows = rows.map(r => [
    r.invoice_number ?? '',
    r.invoice_status,
    `${r.model_prenom} ${r.model_nom ?? ''}`.trim(),
    r.model_email,
    r.project,
    r.date,
    r.payment_amount != null ? r.payment_amount.toFixed(2) : '',
    r.role,
  ])
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
  return 'sep=,\r\n' + [headers, ...dataRows].map(row => row.map(escape).join(',')).join('\r\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:pure`
Expected: PASS — all `filterInvoices`, `groupByModel`, `groupBySession`, `buildInvoiceCsv` tests green.

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/factures.ts tests/pure.test.ts
git commit -m "feat: logique pure de filtrage/regroupement/export CSV des factures"
```

---

### Task 3: Persist model address + real invoice number on `/facture/[token]`

**Files:**
- Modify: `src/app/api/facture/[token]/route.ts`
- Modify: `src/app/facture/[token]/page.tsx`

**Interfaces:**
- Consumes: `Candidature.adresse` (Task 1).
- Produces: no new exports — internal page/route change only.

- [ ] **Step 1: Update `GET`/`PATCH` in the facture API route**

Replace the full contents of `src/app/api/facture/[token]/route.ts`:

```ts
// GET /api/facture/[token] — données publiques pour la page facture.
// Pas d'auth — le token UUID est suffisant comme preuve d'identité.
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const res = await fetch(
    `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=token,role,model_prenom,model_nom,model_email,payment_amount,invoice_number,session:sessions(project,date,compensation_json)&limit=1`,
    { headers, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  const [row] = await res.json() as Array<{
    token:          string
    role:           string
    model_prenom:   string
    model_nom:      string | null
    model_email:    string
    payment_amount: number | null
    invoice_number: string | null
    session: {
      project:          string
      date:             string
      compensation_json: { type: string; amount: string | null; payment_method: string | null } | null
    } | null
  }>

  if (!row) return NextResponse.json({ success: false, message: 'Lien invalide.' }, { status: 404 })

  // L'adresse est liée au modèle (candidatures), pas à cette facture précise.
  const cRes = await fetch(
    `${url}/rest/v1/candidatures?email=eq.${encodeURIComponent(row.model_email)}&select=adresse&limit=1`,
    { headers, cache: 'no-store' }
  )
  const [candidature] = cRes.ok ? await cRes.json() as Array<{ adresse: string | null }> : [{ adresse: null }]

  return NextResponse.json({ success: true, data: { ...row, adresse: candidature?.adresse ?? null } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.json({ success: false }, { status: 400 })

  const body = await req.json() as { payment_amount?: number | null; adresse?: string }
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }

  if (body.payment_amount !== undefined) {
    const res = await fetch(`${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ payment_amount: body.payment_amount }),
    })
    if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })
  }

  if (typeof body.adresse === 'string') {
    // Récupérer le model_email de la facture pour cibler la bonne candidature
    const mRes = await fetch(
      `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=model_email&limit=1`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    )
    if (!mRes.ok) return NextResponse.json({ success: false }, { status: 500 })
    const [row] = await mRes.json() as Array<{ model_email: string }>
    if (!row) return NextResponse.json({ success: false }, { status: 404 })

    const aRes = await fetch(`${url}/rest/v1/candidatures?email=eq.${encodeURIComponent(row.model_email)}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ adresse: body.adresse }),
    })
    if (!aRes.ok) return NextResponse.json({ success: false }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Update the invoice page to prefill and persist the address, and show the real invoice number**

In `src/app/facture/[token]/page.tsx`:

Replace the `InvoiceData` interface:

```ts
interface InvoiceData {
  token:          string
  role:           string
  model_prenom:   string
  model_nom:      string | null
  model_email:    string
  payment_amount: number | null
  invoice_number: string | null
  adresse:        string | null
  session: {
    project:           string
    date:              string
    compensation_json: { type: string; amount: string | null; payment_method: string | null } | null
  } | null
}
```

Replace the `useEffect` block:

```ts
  useEffect(() => {
    fetch(`/api/facture/${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.message ?? 'Lien invalide.'); return }
        setData(d.data)
        setAdresse(d.data.adresse ?? '')
        const initial = d.data.payment_amount
          ?? (d.data.session?.compensation_json?.amount ? parseFloat(d.data.session.compensation_json.amount) : null)
          ?? 0
        setAmountInput(initial.toString())
      })
      .catch(() => setError('Erreur réseau.'))
  }, [token])
```

Replace the `invoiceNum` line (it currently derives from the token):

```ts
  const invoiceNum = data.invoice_number ?? `FLW-${new Date().getFullYear()}-${token.slice(0, 6).toUpperCase()}`
```

(Fallback kept for any invoice created before the trigger existed — `invoice_number` will be `null` for those.)

Replace the address `<input>`'s `onChange` to also persist on blur — change:

```tsx
              <input
                className="no-print"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                placeholder="Votre adresse complète"
                style={{ ...inputStyle, width: '240px' }}
              />
```

to:

```tsx
              <input
                className="no-print"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                onBlur={async () => {
                  await fetch(`/api/facture/${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adresse }),
                  })
                }}
                placeholder="Votre adresse complète"
                style={{ ...inputStyle, width: '240px' }}
              />
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, open `/facture/<un token existant depuis Supabase>`, type an address, click elsewhere (blur), reload the page — the address must still be there. Edit the amount, reload — amount must persist (already worked before this task, confirms nothing broke).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/facture/\[token\]/route.ts src/app/facture/\[token\]/page.tsx
git commit -m "feat: persiste l'adresse du modele et utilise le vrai numero de facture"
```

---

### Task 4: `GET /api/factures` — list endpoint

**Files:**
- Create: `src/app/api/factures/route.ts`

**Interfaces:**
- Consumes: `filterInvoices`, `groupByModel`, `groupBySession`, `InvoiceRow` from `src/lib/factures.ts` (Task 2); `verifyToken` from `src/lib/auth.ts`.
- Produces: `GET /api/factures?groupBy=model|session&status=&from=&to=&q=` → `{ success: true, data: ModelGroup[] | SessionGroupRow[], groupBy: 'model' | 'session' }`, consumed by Task 6 (admin page).

- [ ] **Step 1: Implement the route**

```ts
// GET /api/factures — liste des factures (session_models avec payment_amount non-null),
// filtrée et groupée par modèle ou par session.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { filterInvoices, groupByModel, groupBySession, type InvoiceRow, type InvoiceStatus } from '@/lib/factures'

const VALID_STATUSES: InvoiceStatus[] = ['pending', 'sent', 'paid']

export async function GET(request: NextRequest) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const groupBy   = searchParams.get('groupBy') === 'model' ? 'model' : 'session'
  const statusRaw = searchParams.get('status')
  const status    = VALID_STATUSES.includes(statusRaw as InvoiceStatus) ? (statusRaw as InvoiceStatus) : undefined
  const from      = searchParams.get('from') ?? undefined
  const to        = searchParams.get('to') ?? undefined
  const q         = searchParams.get('q') ?? undefined

  const url  = process.env.SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const res = await fetch(
    `${url}/rest/v1/session_models?payment_amount=not.is.null&select=id,invoice_number,invoice_status,token,role,model_prenom,model_nom,model_email,payment_amount,session:sessions(id,project,date)`,
    { headers, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })

  const raw = await res.json() as Array<{
    id: string; invoice_number: string | null; invoice_status: string | null
    token: string; role: string; model_prenom: string; model_nom: string | null
    model_email: string; payment_amount: number | null
    session: { id: string; project: string; date: string } | null
  }>

  const rows: InvoiceRow[] = raw
    .filter((r): r is typeof raw[number] & { session: NonNullable<typeof raw[number]['session']> } => r.session !== null)
    .map(r => ({
      id:             r.id,
      invoice_number: r.invoice_number,
      invoice_status: (VALID_STATUSES.includes(r.invoice_status as InvoiceStatus) ? r.invoice_status : 'pending') as InvoiceStatus,
      token:          r.token,
      role:           r.role,
      model_prenom:   r.model_prenom,
      model_nom:      r.model_nom,
      model_email:    r.model_email,
      payment_amount: r.payment_amount,
      session_id:     r.session.id,
      project:        r.session.project,
      date:           r.session.date,
    }))

  const filtered = filterInvoices(rows, { status, from, to, q })
  const data = groupBy === 'model' ? groupByModel(filtered) : groupBySession(filtered)

  return NextResponse.json({ success: true, data, groupBy })
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Manual smoke check**

Requires Task 1's migration already applied. Run `npm run dev`, log into `/admin/login`, then in the browser console on any admin page run:
```js
fetch('/api/factures').then(r => r.json()).then(console.log)
```
Expected: `{ success: true, data: [...], groupBy: 'session' }` — an array (empty is fine if no invoice has been generated yet in this environment).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/factures/route.ts
git commit -m "feat: endpoint GET /api/factures (liste filtree et groupee)"
```

---

### Task 5: `PATCH /api/factures/[id]` — update invoice status

**Files:**
- Create: `src/app/api/factures/[id]/route.ts`

**Interfaces:**
- Consumes: `verifyToken` from `src/lib/auth.ts`.
- Produces: `PATCH /api/factures/[id]` body `{ invoice_status: 'pending' | 'sent' | 'paid' }` → `{ success: true }`, consumed by Task 6.

- [ ] **Step 1: Implement the route**

```ts
// PATCH /api/factures/[id] — met à jour le statut d'une facture (session_models.invoice_status).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const VALID_STATUSES = ['pending', 'sent', 'paid']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { invoice_status?: string }

  if (!body.invoice_status || !VALID_STATUSES.includes(body.invoice_status)) {
    return NextResponse.json({ success: false, message: 'Statut invalide.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(`${url}/rest/v1/session_models?id=eq.${encodeURIComponent(id)}`, {
    method:  'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ invoice_status: body.invoice_status }),
  })

  if (!res.ok) return NextResponse.json({ success: false }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/factures/\[id\]/route.ts
git commit -m "feat: endpoint PATCH /api/factures/[id] (statut de facture)"
```

---

### Task 6: `POST /api/factures/[id]/resend` — resend the payment email

**Files:**
- Create: `src/app/api/factures/[id]/resend/route.ts`

**Interfaces:**
- Consumes: `buildReminderHtml` from `@/app/api/sessions/remind/route` (already exported and already imported cross-route by `src/app/api/cron/reminders/route.ts:6` — established pattern, not new). Consumes: `verifyToken` from `src/lib/auth.ts`.
- Produces: `POST /api/factures/[id]/resend` → `{ success: true }`, consumed by Task 6 admin page's "Renvoyer" button.

- [ ] **Step 1: Implement the route**

```ts
// POST /api/factures/[id]/resend — renvoie l'email "Paiement" à un modèle précis
// (contrairement à /api/sessions/remind qui cible tous les modèles confirmés d'une
// session à la fois — ici on cible une seule ligne session_models par son id).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { buildReminderHtml } from '@/app/api/sessions/remind/route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request)
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const { id } = await params
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const mRes = await fetch(
    `${url}/rest/v1/session_models?id=eq.${encodeURIComponent(id)}&select=model_prenom,model_email,token,group:session_groups(call_time),session:sessions(project,date,address,contact_name,contact_phone,compensation_json)&limit=1`,
    { headers }
  )
  if (!mRes.ok) return NextResponse.json({ success: false }, { status: 500 })

  const [row] = await mRes.json() as Array<{
    model_prenom: string; model_email: string; token: string
    group:   { call_time: string } | null
    session: {
      project: string; date: string; address: string
      contact_name: string | null; contact_phone: string | null
      compensation_json: { amount: string | null; payment_method: string | null; delay: string | null } | null
    } | null
  }>
  if (!row || !row.session) return NextResponse.json({ success: false, message: 'Facture introuvable.' }, { status: 404 })

  const comp = row.session.compensation_json
  const { subject, html } = buildReminderHtml('paiement', {
    prenom:             row.model_prenom,
    project:            row.session.project,
    date:               row.session.date,
    address:            row.session.address,
    callTime:           row.group?.call_time ?? null,
    contactName:        row.session.contact_name,
    contactPhone:       row.session.contact_phone,
    token:              row.token,
    compensationAmount: comp?.amount ?? null,
    compensationMethod: comp?.payment_method ?? null,
    compensationDelay:  comp?.delay ?? null,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Flawa Models <casting@luminamodels.ca>', to: [row.model_email], subject, html }),
  })
  if (!res.ok) return NextResponse.json({ success: false }, { status: 502 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/factures/\[id\]/resend/route.ts
git commit -m "feat: endpoint POST /api/factures/[id]/resend (renvoi email paiement)"
```

---

### Task 7: Admin page `/admin/factures`

**Files:**
- Create: `src/app/admin/factures/page.tsx`
- Modify: `src/components/admin/AdminNav.tsx:50`

**Interfaces:**
- Consumes: `GET /api/factures` (Task 4), `PATCH /api/factures/[id]` (Task 5), `POST /api/factures/[id]/resend` (Task 6), `buildInvoiceCsv` from `src/lib/factures.ts` (Task 2), `ModelGroup`/`SessionGroupRow`/`InvoiceStatus` types (Task 2).

- [ ] **Step 1: Wire the nav link**

In `src/components/admin/AdminNav.tsx:50`, change:

```ts
            { label: 'Factures', href: '#' },
```

to:

```ts
            { label: 'Factures', href: '/admin/factures' },
```

- [ ] **Step 2: Implement the page**

Create `src/app/admin/factures/page.tsx` (follows the `src/app/admin/sessions/page.tsx` structure: own sticky nav, `useEffect` fetch with `router.replace('/admin/login')` on `!success`, inline styles matching the design tokens already used across `/admin`):

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InvoiceStatus, ModelGroup, SessionGroupRow } from '@/lib/factures'
import { buildInvoiceCsv } from '@/lib/factures'

const STATUS_LABEL: Record<InvoiceStatus, string> = { pending: 'En attente', sent: 'Envoyée', paid: 'Payée' }
const STATUS_CYCLE: InvoiceStatus[] = ['pending', 'sent', 'paid']
const STATUS_COLOR: Record<InvoiceStatus, string> = {
  pending: 'var(--muted)',
  sent:    '#2563eb',
  paid:    'rgba(20,120,60,.85)',
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FacturesPage() {
  const router = useRouter()
  const [groupBy,  setGroupBy]  = useState<'session' | 'model'>('session')
  const [status,   setStatus]   = useState<InvoiceStatus | ''>('')
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')
  const [q,        setQ]        = useState('')
  const [rows,     setRows]     = useState<(ModelGroup | SessionGroupRow)[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function fetchData() {
    setLoading(true)
    const params = new URLSearchParams({ groupBy })
    if (status) params.set('status', status)
    if (from)   params.set('from', from)
    if (to)     params.set('to', to)
    if (q)      params.set('q', q)

    fetch(`/api/factures?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.replace('/admin/login'); return }
        setRows(d.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(fetchData, [groupBy, status, from, to, q])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  async function cycleStatus(id: string, current: InvoiceStatus) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
    await fetch(`/api/factures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_status: next }),
    })
    fetchData()
  }

  async function resend(id: string) {
    await fetch(`/api/factures/${id}/resend`, { method: 'POST' })
  }

  function toggle(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function handleExportCSV() {
    const allInvoices = rows.flatMap(r => r.invoices)
    const csv  = buildInvoiceCsv(allInvoices)
    const blob = new Blob([new TextEncoder().encode('﻿' + csv)], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `factures-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Montserrat', sans-serif", fontWeight: 300, fontSize: '.6rem',
    background: 'transparent', border: '1px solid var(--border)', outline: 'none',
    padding: '.35rem .6rem', color: 'var(--ink)',
  }
  const btnToggle: React.CSSProperties = {
    fontSize: '.42rem', letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase',
    padding: '.3rem .8rem', cursor: 'pointer', border: '1px solid var(--border)', background: 'none',
  }

  return (
    <div className="min-h-dvh bg-paper" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-paper" style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 2rem' }}>
        <div className="flex items-center gap-8">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>F</span>
          <span className="hidden md:block font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.3em' }}>Factures</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/admin/dashboard')} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>← Dashboard</button>
          <button onClick={logout} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-red" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>Déconnexion</button>
        </div>
      </nav>

      <div style={{ padding: '2rem' }}>
        {/* Barre d'actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.6rem', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
            <button onClick={() => setGroupBy('session')} style={{ ...btnToggle, borderRight: '1px solid var(--border)', color: groupBy === 'session' ? 'var(--ink)' : 'var(--muted)', background: groupBy === 'session' ? 'rgba(0,0,0,.04)' : 'none' }}>Par session</button>
            <button onClick={() => setGroupBy('model')} style={{ ...btnToggle, color: groupBy === 'model' ? 'var(--ink)' : 'var(--muted)', background: groupBy === 'model' ? 'rgba(0,0,0,.04)' : 'none' }}>Par modèle</button>
          </div>

          <select value={status} onChange={e => setStatus(e.target.value as InvoiceStatus | '')} style={inputStyle}>
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
          </select>

          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} aria-label="Date de début" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} aria-label="Date de fin" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher modèle ou projet…" style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />

          <button onClick={handleExportCSV} style={btnToggle}>Exporter CSV</button>
          <button onClick={() => window.open(`/admin/factures/print?${new URLSearchParams({ groupBy, status, from, to, q }).toString()}`, '_blank')} style={btnToggle}>Vue imprimable</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="font-light text-muted" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem' }}>Chargement…</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: 'rgba(139,0,32,.15)' }}>Aucune facture</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {rows.map(group => {
              const key = 'session_id' in group ? group.session_id : group.model_email
              const isOpen = expanded.has(key)
              const title = 'session_id' in group ? group.project : group.model_name
              const subtitle = 'session_id' in group ? fmtDate(group.date) : `${group.invoices.length} facture${group.invoices.length > 1 ? 's' : ''} · ${group.total_paid.toFixed(2)} $ payé`

              return (
                <div key={key} style={{ border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '1rem 1.2rem', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{subtitle}</div>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{isOpen ? '︿' : '﹀'}</span>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {group.invoices.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.7rem 1.2rem', borderBottom: '1px solid var(--border)', gap: '.8rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '.7rem', color: 'var(--ink)', fontWeight: 600 }}>
                              {'session_id' in group ? `${inv.model_prenom} ${inv.model_nom ?? ''}` : inv.project}
                            </div>
                            <div style={{ fontSize: '.58rem', color: 'var(--muted)' }}>
                              {inv.invoice_number ?? 'Non numérotée'} · {inv.role} · {inv.payment_amount?.toFixed(2) ?? '0.00'} $
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => cycleStatus(inv.id, inv.invoice_status)}
                            style={{ fontSize: '.42rem', letterSpacing: '.12em', fontWeight: 600, textTransform: 'uppercase', color: STATUS_COLOR[inv.invoice_status], background: 'none', border: `1px solid ${STATUS_COLOR[inv.invoice_status]}`, padding: '.25rem .6rem', cursor: 'pointer', flexShrink: 0 }}
                          >
                            {STATUS_LABEL[inv.invoice_status]}
                          </button>
                          <a href={`/facture/${inv.token}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.62rem', color: 'var(--muted)', textDecoration: 'none' }}>↗ Voir</a>
                          <button type="button" onClick={() => resend(inv.id)} style={{ fontSize: '.58rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }} title="Renvoyer l'email">✉</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Manual smoke check**

Run `npm run dev`, log in, click "Factures" in the nav — must load `/admin/factures` (no more dead `#` link), toggle Par session/Par modèle, apply a status filter, click a status badge to cycle it, click "Exporter CSV" and open the downloaded file — confirm each invoice is its own row with distinct columns (open in a plain text editor, not just Excel, to see the raw `\r\n`-separated structure).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/factures/page.tsx src/components/admin/AdminNav.tsx
git commit -m "feat: page admin /admin/factures (liste, statut, export)"
```

---

### Task 8: Printable view `/admin/factures/print`

**Files:**
- Create: `src/app/admin/factures/print/page.tsx`

**Interfaces:**
- Consumes: `GET /api/factures` (Task 4).

- [ ] **Step 1: Implement the page**

Reads the same query params as the main list (passed through by Task 6's "Vue imprimable" button), fetches once, renders a flat printable table, and reuses the `window.print()` pattern already used on `/facture/[token]`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { InvoiceRow, ModelGroup, SessionGroupRow } from '@/lib/factures'

export default function FacturesPrintPage() {
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/factures?${searchParams.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const groups = d.data as (ModelGroup | SessionGroupRow)[]
        setRows(groups.flatMap(g => g.invoices))
      })
      .finally(() => setLoading(false))
  }, [searchParams])

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>Chargement…</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Arial, sans-serif', color: '#0a0a0a' }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print" style={{ marginBottom: '16px' }}>
        <button onClick={() => window.print()} style={{ background: '#8B0020', color: '#fff', border: 'none', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          Imprimer / Télécharger PDF
        </button>
      </div>

      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>Factures — {rows.length} résultat{rows.length > 1 ? 's' : ''}</h1>

      <table width="100%" cellPadding={0} cellSpacing={0}>
        <thead>
          <tr style={{ background: '#0a0a0a' }}>
            {['Numéro', 'Statut', 'Modèle', 'Projet', 'Date', 'Montant', 'Rôle'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#fff' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.invoice_number ?? '—'}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.invoice_status}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.model_prenom} {r.model_nom ?? ''}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.project}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.date}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.payment_amount?.toFixed(2) ?? '0.00'} $</td>
              <td style={{ padding: '8px 10px', fontSize: '11px' }}>{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/factures/print/page.tsx
git commit -m "feat: vue imprimable des factures (export PDF via window.print)"
```

---

### Task 9: E2E test for the new admin page

**Files:**
- Create: `e2e/factures.spec.ts`

**Interfaces:**
- Consumes: nothing new — mocks `/api/factures`, `/api/factures/[id]`, `/api/refresh` the same way `e2e/dashboard.spec.ts` mocks `/api/candidatures`.

- [ ] **Step 1: Write the test file**

```ts
/**
 * e2e/factures.spec.ts
 *
 * Tests Playwright pour /admin/factures.
 * Même stratégie que dashboard.spec.ts : mock toutes les routes API,
 * jamais de vraie base de données.
 */

import { test, expect, type Page } from '@playwright/test'

const SESSION_GROUPS = [
  {
    session_id: 's1', project: 'Campagne Été', date: '2026-06-12',
    invoices: [
      {
        id: 'sm1', invoice_number: 'FLW-2026-0001', invoice_status: 'paid',
        token: 't1', role: 'Mannequin', model_prenom: 'Julie', model_nom: 'Tremblay',
        model_email: 'julie@example.com', payment_amount: 450,
        session_id: 's1', project: 'Campagne Été', date: '2026-06-12',
      },
    ],
  },
]

async function setupFactures(page: Page, groups = SESSION_GROUPS) {
  await page.route('**/api/refresh', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  )
  await page.route('**/api/factures?*', route => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: groups, groupBy: 'session' }) })
    } else {
      route.continue()
    }
  })
  await page.goto('/admin/factures')
  await page.waitForSelector('text=Campagne Été', { timeout: 15_000 })
}

test.describe('Auth', () => {
  test('sans cookie → redirige vers /admin/login', async ({ page }) => {
    await page.route('**/api/factures?*', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) })
    )
    await page.route('**/api/refresh', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    )
    await page.goto('/admin/factures')
    await page.waitForURL('**/admin/login', { timeout: 10_000 })
    expect(page.url()).toContain('/admin/login')
  })
})

test.describe('Liste', () => {
  test('affiche les groupes de session après chargement', async ({ page }) => {
    await setupFactures(page)
    await expect(page.getByText('Campagne Été')).toBeVisible()
  })

  test('clic sur un groupe → affiche la facture', async ({ page }) => {
    await setupFactures(page)
    await page.getByText('Campagne Été').click()
    await expect(page.getByText('FLW-2026-0001')).toBeVisible()
    await expect(page.getByText('Payée')).toBeVisible()
  })

  test('bascule Par modèle → requête refetch avec groupBy=model', async ({ page }) => {
    await setupFactures(page)
    let requestedGroupBy = ''
    await page.route('**/api/factures?*', route => {
      requestedGroupBy = new URL(route.request().url()).searchParams.get('groupBy') ?? ''
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], groupBy: 'model' }) })
    })
    await page.getByRole('button', { name: 'Par modèle' }).click()
    await expect.poll(() => requestedGroupBy).toBe('model')
  })
})

test.describe('Statut', () => {
  test('clic sur le badge de statut → PATCH puis refetch', async ({ page }) => {
    await setupFactures(page)
    await page.getByText('Campagne Été').click()

    let patchedBody: unknown = null
    await page.route('**/api/factures/sm1', route => {
      patchedBody = route.request().postDataJSON()
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })

    await page.getByRole('button', { name: 'Payée' }).click()
    await expect.poll(() => patchedBody).toEqual({ invoice_status: 'pending' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails first**

Run: `npx playwright test e2e/factures.spec.ts`
Expected: FAIL (page doesn't exist / nav link doesn't point to `/admin/factures` yet) — confirms the test actually exercises Task 6's page before it existed. Since Task 6 already ran earlier in this plan, this step instead confirms the test is correctly wired: if it's run after Task 6 is committed, it should PASS immediately. If it fails for a reason other than "page not found" (e.g. a selector typo), fix the test, not the page.

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx playwright test e2e/factures.spec.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 4: Commit**

```bash
git add e2e/factures.spec.ts
git commit -m "test: e2e pour la page admin /admin/factures"
```

---

### Task 10: Update `docs/GUIDE.md` section 8

**Files:**
- Modify: `docs/GUIDE.md`

- [ ] **Step 1: Replace section 8**

Find the existing `## 8. Factures` section (currently ends right before `## 9. Variables d'environnement`) and replace its body with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/GUIDE.md
git commit -m "docs: section factures mise a jour (page admin, statuts, adresse)"
```

---

## Self-Review Notes

**Spec coverage:**
- Modèle de données (colonnes + trigger + compteur) → Task 1. ✓
- Page facture existante (adresse pré-remplie, PATCH adresse, invoice_number) → Task 3. ✓
- Page admin (toggle, filtres, actions, statut) → Task 7. ✓
- Export CSV lignes/colonnes séparées → Task 2 (`buildInvoiceCsv`) + tests explicites vérifiant que ce n'est pas une seule ligne. ✓
- Export PDF groupé sans nouvelle librairie → Task 8. ✓
- Endpoints API (`GET /api/factures`, `PATCH /api/factures/[id]`, `POST /api/factures/[id]/resend`) → Tasks 4, 5, 6. ✓
- Lien mort `AdminNav` → Task 7 Step 1. ✓
- Doc GUIDE.md → Task 10. ✓
- Décision explicite "pas de détection automatique du retour signé" → documentée dans GUIDE.md (Task 10) et dans le comportement du badge de statut (Task 7) — aucun code ne prétend automatiser ça.

**Placeholder scan:** none found — every step has literal code or an exact command with expected output.

**Type consistency:** `InvoiceRow`, `InvoiceStatus`, `ModelGroup`, `SessionGroupRow` defined once in Task 2 and imported with identical names/shapes in Tasks 4, 6, 7, 8. `SessionModel.invoice_status`/`invoice_number` defined in Task 1 and used with the same names throughout.
