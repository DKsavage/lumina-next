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
  photo_profil_signed?: string | null
  photo_body_signed?:   string | null
}

export interface Group {
  name:    string
  time:    string
  members: string
}

export interface SessionForm {
  project:   string
  dateFr:    string
  dateEn:    string
  addressFr: string
  groups:    Group[]
  notesFr:   string
  notesEn:   string
  unpaid:    boolean
  moodboard: boolean
  whatsapp:  string
}

export const defaultSession: SessionForm = {
  project: '', dateFr: '', dateEn: '', addressFr: '',
  groups: [{ name: '', time: '', members: '' }],
  notesFr: '', notesEn: '', unpaid: false, moodboard: false, whatsapp: '',
}

export type SortKey = 'date' | 'nom' | 'taille'

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
