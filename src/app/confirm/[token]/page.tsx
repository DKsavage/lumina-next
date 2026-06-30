// Page publique de confirmation — accessible sans auth via token UUID.
// Lecture seule : pas de mutation DB ici, tout passe par /api/confirm.
// Next.js 15 : params et searchParams sont des Promises (await obligatoire).
import type { Metadata } from 'next'
import { ConfirmActions } from '@/components/confirm/ConfirmActions'

export const metadata: Metadata = {
  title: 'Confirmation de participation — Flawa Models',
  robots: 'noindex',
}

// Typage du row retourné par Supabase REST (session_models avec joins)
interface SessionModelRow {
  model_prenom:  string
  model_email:   string
  status:        'pending' | 'confirmed' | 'cancelled'
  session: {
    project:       string
    date:          string
    address:       string
    contact_name:  string | null
    contact_phone: string | null
  }
  group: {
    name:         string
    call_time:    string
    duration_min: number | null
    look_brief:   string | null
    bring_items:  string | null
  } | null
}

async function fetchSessionModel(token: string): Promise<SessionModelRow | null> {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(
    `${url}/rest/v1/session_models?token=eq.${encodeURIComponent(token)}&select=model_prenom,model_email,status,session:sessions(project,date,address,contact_name,contact_phone),group:session_groups(name,call_time,duration_min,look_brief,bring_items)&limit=1`,
    {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      // Ne pas mettre en cache — le statut peut changer après un clic Confirmer/Annuler
      cache: 'no-store',
    },
  )

  if (!res.ok) return null
  const rows = await res.json() as SessionModelRow[]
  return rows[0] ?? null
}

function addMins(time: string, mins: number): string {
  const [h, m] = time.replace('h', ':').split(':').map(Number)
  const t = (h * 60) + (m || 0) + mins
  // % 24 pour gérer l'overflow minuit (ex: 23h45 + 30min → 00h15)
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}h${String(t % 60).padStart(2, '0')}`
}

// Shell de mise en page — fond ivoire + carte blanche centrée, sans layout admin
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#f7f3ee', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: '#fff', padding: '2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        {children}
      </div>
    </div>
  )
}

// Ligne d'info : icône + label + valeur — highlight en rouge pour le call time
function Row({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '.8rem', alignItems: 'baseline' }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '.65rem', letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#9b9b9b', fontWeight: 600, marginBottom: '.2rem' }}>{label}</div>
        <div style={{ fontSize: '.9rem', color: highlight ? '#8B0020' : '#0c0b09', fontWeight: highlight ? 700 : 400, lineHeight: 1.6 }}>{value}</div>
      </div>
    </div>
  )
}

interface Props {
  params:      Promise<{ token: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ConfirmPage({ params }: Props) {
  const { token } = await params

  const sm = await fetchSessionModel(token)

  if (!sm) {
    return (
      <PageShell>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: '#8B0020', margin: '0 0 1rem' }}>Lien invalide</h1>
        <p style={{ color: '#6b6b6b', lineHeight: 1.7, margin: 0 }}>Ce lien de confirmation n'existe pas ou a expiré.</p>
        <div style={{ marginTop: '3rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem', fontSize: '.75rem', color: '#9b9b9b' }}>
          <span style={{ fontFamily: 'Georgia, serif', color: '#8B0020', fontWeight: 700 }}>Flawa Models</span>
          {' '}· casting@flawamodels.ca
        </div>
      </PageShell>
    )
  }

  const session  = sm.session
  const group    = sm.group

  const dateLabel = new Date(session.date + 'T12:00:00').toLocaleDateString('fr-CA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Fin estimée : call time + durée du groupe si renseignée
  const endTime = group?.call_time && group.duration_min
    ? ` → fin estimée ~${addMins(group.call_time, group.duration_min)}`
    : ''

  return (
    <PageShell>
      {/* Badge statut — visible dès que l'action a été enregistrée */}
      {sm.status === 'confirmed' && (
        <div style={{ background: 'rgba(20,120,60,.08)', border: '1px solid rgba(20,120,60,.25)', padding: '.8rem 1.2rem', marginBottom: '2rem', fontSize: '.85rem', color: 'rgba(20,120,60,.9)', fontWeight: 600, borderRadius: '2px' }}>
          ✓ Vous avez confirmé votre participation
        </div>
      )}
      {sm.status === 'cancelled' && (
        <div style={{ background: 'rgba(139,0,32,.05)', border: '1px solid rgba(139,0,32,.18)', padding: '.8rem 1.2rem', marginBottom: '2rem', fontSize: '.85rem', color: '#8B0020', fontWeight: 600, borderRadius: '2px' }}>
          Annulation enregistrée
        </div>
      )}

      <p style={{ fontSize: '.78rem', color: '#6b6b6b', marginBottom: '.5rem', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 .5rem' }}>Convocation</p>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#0c0b09', lineHeight: 1.2, margin: '0 0 2rem' }}>
        {session.project}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
        <Row icon="📅" label="Date" value={dateLabel} />
        <Row icon="📍" label="Lieu" value={session.address} />
        {group && (
          <Row
            icon="🕐"
            label="Votre call time"
            value={`${group.call_time}${endTime}`}
            highlight
          />
        )}
        {group?.look_brief && <Row icon="👗" label="Look demandé" value={group.look_brief} />}
        {group?.bring_items && <Row icon="🎒" label="Apporter" value={group.bring_items} />}
        {session.contact_name && (
          <Row
            icon="📞"
            label="Contact sur place"
            value={`${session.contact_name}${session.contact_phone ? ` · ${session.contact_phone}` : ''}`}
          />
        )}
      </div>

      {/* Boutons uniquement si statut pending — ConfirmActions gère l'état client (motif annulation) */}
      {sm.status === 'pending' && (
        <ConfirmActions token={token} prenom={sm.model_prenom} />
      )}

      <div style={{ marginTop: '3rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem', fontSize: '.75rem', color: '#9b9b9b' }}>
        <span style={{ fontFamily: 'Georgia, serif', color: '#8B0020', fontWeight: 700 }}>Lumina</span>
        {' '}Photography · casting@luminamodels.ca
      </div>
    </PageShell>
  )
}
