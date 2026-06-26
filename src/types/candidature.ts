// candidature.ts — types partagés entre le dashboard, les hooks et les composants admin.
// Toute modification du schéma DB se répercute ici en premier.

export interface Candidature {
  id:                   string
  prenom:               string
  nom:                  string
  email:                string
  telephone:            string
  instagram?:           string | null
  taille?:              number | null
  genre?:               string | null
  poitrine?:            number | null
  tour_taille?:         number | null
  hanches?:             number | null
  pointure?:            number | null
  poids?:               number | null
  taille_haut?:         string | null
  taille_bas?:          string | null
  teint?:               string | null
  couleur_yeux?:        string | null
  longueur_cheveux?:    string | null
  couleur_cheveux?:     string | null
  aspect?:              string | null
  ville?:               string | null
  pays?:                string | null
  date_naissance?:      string | null
  langues?:             string | null
  experience?:          string | null
  disponibilite?:       string | null
  date_inscription:     string
  selectionne:          boolean
  archived:             boolean
  tier?:                'ambassadeur' | 'permanent' | 'banque' | null
  photo_profil_signed?: string | null
  photo_body_signed?:   string | null
}

// Remplace l'ancien Group et SessionForm.
// Le type complet SessionGroup (côté DB) est dans src/types/session.ts.
// SessionForm est ce que le Composer collecte avant persistance en DB.

export interface Group {
  id?:          string  // présent seulement après création en DB
  name:         string
  call_time:    string
  duration_min: number | null
  look_brief:   string
  bring_items:  string
  // SÉRIALIZATION : Set n'est pas JSON-compatible.
  // Avant tout fetch API, convertir en tableau : assignedIds: [...g.assignedIds]
  assignedIds:  Set<string>  // IDs des candidatures assignées à ce groupe
}

export interface SessionForm {
  project:              string
  type:                 'photo' | 'video' | 'hybrid'
  date:                 string          // ISO "2026-06-12" depuis input type="date"
  address:              string
  access_instructions:  string
  contact_name:         string
  contact_phone:        string
  groups:               Group[]
  prep_notes:           string
  team:                 { makeup: boolean; hair: boolean; stylist: boolean; photo: boolean }
  compensation_type:    'tfp' | 'paid' | 'expenses'
  compensation_amount:  string
  compensation_method:  string
  compensation_delay:   string
  cancel_deadline_days: number
  max_models:           number | null
  notes_internal:       string
  notes_models:         string
  moodboard_url:        string
  whatsapp:             string
}

export const defaultSession: SessionForm = {
  project: '', type: 'photo', date: '', address: '', access_instructions: '',
  contact_name: '', contact_phone: '',
  groups: [{ name: '', call_time: '', duration_min: null, look_brief: '', bring_items: '', assignedIds: new Set() }],
  prep_notes: '',
  team: { makeup: false, hair: false, stylist: false, photo: false },
  compensation_type: 'tfp', compensation_amount: '', compensation_method: '', compensation_delay: '',
  cancel_deadline_days: 3,
  max_models: null,
  notes_internal: '', notes_models: '', moodboard_url: '', whatsapp: '',
}

export type SortKey = 'date' | 'nom' | 'taille' | 'age'

// Type guard — valide la forme minimale avant d'injecter dans le state.
// On vérifie id + email sur le premier élément : suffisant pour détecter
// un changement de schéma ou une réponse d'erreur mal formatée.
export function isCandidatureArray(data: unknown): data is Candidature[] {
  if (!Array.isArray(data)) return false
  if (data.length === 0) return true
  const first = data[0] as Record<string, unknown>
  return typeof first?.id === 'string' && typeof first?.email === 'string'
}

// Calcule l'âge depuis une date ISO — retourne null si absente.
export function calcAge(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
