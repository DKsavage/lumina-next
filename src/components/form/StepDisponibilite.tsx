'use client'

import { useState } from 'react'
import { type FormData } from './CandidatureForm'
import { Field, CtaButton, BackButton } from './StepPhotos'

/* Disponibilité : mutually exclusive — indique la disponibilité principale du modèle.
   Aspect : tatouages/piercings visibles — info critique pour certains clients (luxe, beauté). */
const DISPONIBILITES = ['Flexible', 'Jours de semaine', 'Weekends', 'Voyages OK']
const ASPECTS        = ['Aucun', 'Tatouages', 'Piercings', 'Les deux']

/* Date de naissance et disponibilité sont requis pour tout projet.
   Langues et aspect sont optionnels mais très utiles. */
function isValid(d: Partial<FormData>) {
  return d.dateNaissance && d.disponibilite
}

export default function StepDisponibilite({
  data,
  onSubmit,
  onPrev,
  loading = false,
  error   = null,
}: {
  data:     FormData
  onSubmit: (patch: Partial<FormData>) => void | Promise<void>
  onPrev:   () => void
  loading?: boolean
  error?:   string | null
}) {
  const [local, setLocal] = useState({
    dateNaissance: data.dateNaissance,
    disponibilite: data.disponibilite,
    langues:       data.langues,
    aspect:        data.aspect,
  })

  const set = (k: keyof typeof local, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      {/* ── GROUPE A : IDENTITÉ TEMPORELLE ───────── */}
      <GroupLabel>Profil casting</GroupLabel>
      <div className="flex flex-col gap-[.85rem] mb-6 form-fields">

        {/* Date de naissance — "Naissance" plus court pour le label inline (minWidth: 5rem).
            type="date" = picker natif iOS/Android. Valeur ISO YYYY-MM-DD → Supabase date. */}
        <Field label="Naissance" required inline>
          <input
            type="date"
            className="input-underline"
            value={local.dateNaissance}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16))
              .toISOString().split('T')[0]}
            onChange={e => set('dateNaissance', e.target.value)}
          />
        </Field>

        {/* Langues — input texte libre, internationalement plus flexible que des chips */}
        <Field label="Langues" optional inline>
          <input
            type="text"
            placeholder="Français, Anglais, Espagnol…"
            className="input-underline"
            value={local.langues}
            onChange={e => set('langues', e.target.value)}
          />
        </Field>
      </div>

      {/* ── GROUPE B : DISPONIBILITÉ ─────────────── */}
      <GroupLabel>Disponibilité</GroupLabel>
      <div className="flex flex-col gap-[1.1rem] mb-6 form-fields">

        <Field label="Disponibilité" required asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.2rem]">
            {DISPONIBILITES.map(v => (
              <button key={v} type="button"
                className={`chip ${local.disponibilite === v ? 'active' : ''}`}
                aria-pressed={local.disponibilite === v}
                onClick={() => set('disponibilite', v)}
              >{v}</button>
            ))}
          </div>
        </Field>

        {/* Aspect — information critique pour les castings beauté/luxe */}
        <Field label="Tatouages / piercings visibles" optional asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.2rem]">
            {ASPECTS.map(v => (
              <button key={v} type="button"
                className={`chip ${local.aspect === v ? 'active' : ''}`}
                aria-pressed={local.aspect === v}
                onClick={() => set('aspect', v)}
              >{v}</button>
            ))}
          </div>
        </Field>
      </div>

      <CtaButton
        disabled={!isValid(local)}
        loading={loading}
        onClick={() => onSubmit(local)}
      >
        Envoyer ma candidature
      </CtaButton>

      {/* Message d'erreur — role="alert" = annoncé immédiatement par les screen readers */}
      {error && (
        <p
          role="alert"
          className="text-center"
          style={{ fontSize: '.58rem', color: 'var(--red)', marginTop: '.75rem', letterSpacing: '.03em', lineHeight: 1.5 }}
        >
          {error}
        </p>
      )}

      <BackButton onClick={onPrev} />
    </>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 mb-4"
      style={{ borderBottom: '1px solid var(--ivory)', paddingBottom: '.6rem' }}
    >
      <span
        className="font-medium uppercase tracking-[.28em]"
        style={{ fontSize: '.6rem', color: 'var(--red)' }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'transparent' }} />
    </div>
  )
}
