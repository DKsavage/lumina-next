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
