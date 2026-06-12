'use client'

import { useState } from 'react'
import { type FormData } from './CandidatureForm'
import { Field, CtaButton, BackButton } from './StepPhotos'

/* Expérience : chips seulement — pas de Select, pas de dropdown.
   Ville et Pays : inputs libres → candidats internationaux bienvenus. */
const EXPERIENCES = ['Débutant(e)', 'Quelques shootings', 'Expérimenté(e)']

function isValid(d: Partial<FormData>) {
  return d.ville && d.experience
}

export default function StepProfil({
  data,
  onNext,
  onPrev,
}: {
  data:   FormData
  onNext: (patch: Partial<FormData>) => void
  onPrev: () => void
}) {
  const [local, setLocal] = useState({
    ville:      data.ville,
    pays:       data.pays,
    experience: data.experience,
    instagram:  data.instagram,
  })

  const set = (k: keyof typeof local, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      <div className="flex flex-col gap-[1.2rem] mb-6 form-fields">

        {/* Ville — input libre, ouvert à toutes les villes */}
        <Field label="Ville" required inline>
          <input
            type="text"
            placeholder="Paris, Montréal, London…"
            className="input-underline"
            value={local.ville}
            onChange={e => set('ville', e.target.value)}
          />
        </Field>

        {/* Pays — optionnel, pour les candidats hors Québec */}
        <Field label="Pays" optional inline>
          <input
            type="text"
            placeholder="France, Canada, Belgique…"
            className="input-underline"
            value={local.pays}
            onChange={e => set('pays', e.target.value)}
          />
        </Field>

        {/* Expérience — chips */}
        <Field label="Expérience" required asGroup>
          <div className="flex gap-[.4rem] flex-wrap pt-[.1rem]">
            {EXPERIENCES.map(e => (
              <button
                key={e}
                type="button"
                className={`chip ${local.experience === e ? 'active' : ''}`}
                aria-pressed={local.experience === e}
                onClick={() => set('experience', e)}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        {/* Instagram — optionnel, inline */}
        <Field label="Instagram" optional inline>
          <div className="flex items-center gap-2 flex-1">
            <span style={{ fontSize: '.75rem', color: 'rgba(12,11,9,.2)', lineHeight: 1 }}>@</span>
            <input
              type="text"
              placeholder="nomutilisateur"
              className="input-underline"
              style={{ flex: 1 }}
              value={local.instagram}
              onChange={e => set('instagram', e.target.value)}
            />
          </div>
        </Field>
      </div>

      <CtaButton disabled={!isValid(local)} onClick={() => onNext(local)}>
        Continuer — Mensurations
      </CtaButton>
      <BackButton onClick={onPrev} />
    </>
  )
}
