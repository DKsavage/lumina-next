// session.ts — types pour la gestion de sessions photo/vidéo.
// Reflète exactement le schéma Supabase (session_management migration).

export type SessionType = 'photo' | 'video' | 'hybrid'

export type ConfirmStatus = 'pending' | 'confirmed' | 'cancelled'

export type CompensationType = 'tfp' | 'paid' | 'expenses'

export interface TeamChecklist {
  makeup:  boolean
  hair:    boolean
  stylist: boolean
  photo:   boolean
}

export interface Compensation {
  type:           CompensationType
  amount:         number | null
  payment_method: string | null  // "cash" | "virement" | "paypal"
  delay:          string | null  // "sur place" | "sous 30 jours"
}

export interface SessionGroup {
  id?:          string
  session_id?:  string
  name:         string
  call_time:    string
  duration_min: number | null
  look_brief:   string
  bring_items:  string
  sort_order?:  number
}

export interface SessionModel {
  id:                       string
  session_id:               string
  model_email:              string
  model_prenom:             string
  model_langue:             string
  group_id:                 string | null
  token:                    string
  status:                   ConfirmStatus
  confirmed_at:             string | null
  cancelled_at:             string | null
  cancel_reason:            string | null
  question:                 string | null
  reminder_j5_sent_at:      string | null
  reminder_j2_sent_at:      string | null
  reminder_j1_sent_at:      string | null
  reminder_morning_sent_at: string | null
  created_at:               string
}

export interface Session {
  id:                   string
  project:              string
  type:                 SessionType
  date:                 string  // ISO date "2026-06-12"
  address:              string
  access_instructions:  string | null
  contact_name:         string | null
  contact_phone:        string | null
  prep_notes:           string | null
  team_json:            TeamChecklist
  compensation_json:    Compensation
  cancel_deadline_days: number
  notes_internal:       string | null
  notes_models:         string | null
  moodboard_url:        string | null
  status:               string
  created_at:           string
  groups?:              SessionGroup[]
  models?:              SessionModel[]
}

// URL de base du site — utilisé pour construire les liens de confirmation
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://luminamodels.ca'
