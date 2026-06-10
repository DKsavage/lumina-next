'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type FormData } from './CandidatureForm'
import { Field, CtaButton, BackButton, Confidentialite } from './StepPhotos'

const VILLES = ['Montréal', 'Laval', 'Longueuil', 'Québec', 'Ottawa', 'Autre']
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
    experience: data.experience,
    instagram:  data.instagram,
  })

  const set = (k: keyof typeof local, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      <div className="flex flex-col gap-[.85rem] mb-5">

        {/* Ville — Select shadcn restyled */}
        <Field label="Ville" required>
          {/* SelectTrigger hérite de input-underline via la classe CSS injectée */}
          <Select value={local.ville ?? ''} onValueChange={(v: string | null) => set('ville', v ?? '')}>
            <SelectTrigger className="select-underline">
              <SelectValue placeholder="Choisir une ville…" />
            </SelectTrigger>
            <SelectContent className="select-content-couture">
              {VILLES.map(v => (
                <SelectItem key={v} value={v} className="select-item-couture">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Expérience — chips */}
        <Field label="Expérience" required asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.2rem]">
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

        {/* Instagram — optionnel */}
        <Field label="Instagram" optional>
          <div className="flex items-center gap-2">
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
