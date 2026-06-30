// Page publique — modèle vérifie son statut par email. Aucune auth requise.
'use client'

import { useState, type FormEvent } from 'react'

type Statut = 'en_attente' | 'retenu' | 'archive' | 'non_trouve' | null

const MESSAGES: Record<Exclude<Statut, null>, { titre: string; corps: string; couleur: string }> = {
  en_attente: {
    titre: 'Dossier en cours d\'évaluation',
    corps: 'Votre candidature a bien été reçue. Nous vous contacterons si votre profil correspond à nos besoins.',
    couleur: '#6b6b6b',
  },
  retenu: {
    titre: 'Profil retenu ✓',
    corps: 'Vous avez été sélectionné(e) pour une prochaine session. Vérifiez votre boîte email pour les détails de convocation.',
    couleur: 'rgba(20,120,60,.9)',
  },
  archive: {
    titre: 'Dossier archivé',
    corps: 'Votre dossier est actuellement archivé. Vous pouvez soumettre une nouvelle candidature si votre profil a évolué.',
    couleur: '#8B0020',
  },
  non_trouve: {
    titre: 'Aucun dossier trouvé',
    corps: 'Aucune candidature n\'est associée à cet email. Vérifiez l\'adresse ou soumettez une nouvelle candidature.',
    couleur: '#6b6b6b',
  },
}

export default function StatutPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [statut,  setStatut]  = useState<Statut>(null)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setStatut(null)
    try {
      const res  = await fetch(`/api/statut?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json() as { success: boolean; statut?: Statut; message?: string }
      if (!data.success) { setError(data.message ?? 'Erreur.'); return }
      setStatut(data.statut ?? null)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  const info = statut ? MESSAGES[statut] : null

  return (
    <div style={{ minHeight: '100dvh', background: '#f7f3ee', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '3rem 1rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#fff', padding: '2.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>

        <p style={{ fontSize: '.78rem', color: '#6b6b6b', letterSpacing: '.15em', textTransform: 'uppercase',
          fontWeight: 600, margin: '0 0 .5rem' }}>Flawa Models</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#0c0b09', margin: '0 0 2rem' }}>
          Statut de candidature
        </h1>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 600, color: '#6b6b6b',
            letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.5rem' }}>
            Votre adresse email
          </label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            style={{ width: '100%', padding: '.75rem', fontSize: '.9rem', border: '1px solid #e0e0e0',
              outline: 'none', fontFamily: 'Arial, sans-serif', color: '#0c0b09',
              background: '#fff', boxSizing: 'border-box', marginBottom: '1rem' }}
          />
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '1rem', background: '#8B0020', color: '#fff',
              border: 'none', fontSize: '.85rem', fontWeight: 700, letterSpacing: '.1em',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? 'Vérification…' : 'Vérifier mon statut'}
          </button>
        </form>

        {error && <p style={{ marginTop: '1.5rem', color: '#8B0020', fontSize: '.85rem' }}>{error}</p>}

        {info && (
          <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'rgba(0,0,0,.02)',
            borderLeft: `3px solid ${info.couleur}` }}>
            <div style={{ fontSize: '.88rem', fontWeight: 700, color: info.couleur, marginBottom: '.5rem' }}>
              {info.titre}
            </div>
            <p style={{ fontSize: '.85rem', color: '#0c0b09', lineHeight: 1.7, margin: 0 }}>{info.corps}</p>
          </div>
        )}

        <div style={{ marginTop: '3rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem',
          fontSize: '.75rem', color: '#9b9b9b' }}>
          <span style={{ fontFamily: 'Georgia, serif', color: '#8B0020', fontWeight: 700 }}>Flawa Models</span>
          {' '}·{' '}
          <a href="mailto:casting@luminamodels.ca" style={{ color: '#9b9b9b' }}>casting@luminamodels.ca</a>
        </div>
      </div>
    </div>
  )
}
