export type Tier = 'ambassadeur' | 'permanent' | 'banque'

export const TIER_CONFIG: Record<Tier, { label: string; bg: string; color: string; border: string }> = {
  ambassadeur: { label: '★ Ambassadeur', bg: 'rgba(184,134,11,.12)', color: '#B8860B', border: 'rgba(184,134,11,.35)' },
  permanent:   { label: '● Permanent',   bg: 'rgba(139,0,32,.1)',    color: '#8B0020', border: 'rgba(139,0,32,.3)'   },
  banque:      { label: '· Banque',      bg: 'rgba(0,0,0,.06)',      color: '#666',    border: 'var(--border)'       },
}
