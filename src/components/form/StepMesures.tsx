'use client'

import { useState } from 'react'
import { type FormData } from './CandidatureForm'
import { Field, CtaButton, BackButton, Confidentialite } from './StepPhotos'

const YEUX     = ['Marron', 'Noisette', 'Vert', 'Bleu', 'Gris', 'Autre']
const CHEVEUX  = ['Noir', 'Brun', 'Châtain', 'Blond', 'Roux', 'Coloré', 'Autre']
const POINTURES = Array.from({ length: 13 }, (_, i) => String(34 + i)) // 34 → 46

/* Corps obligatoire : poitrine, taille, hanches, pointure, yeux
   Optionnels : poids, cheveux */
function isValid(d: Partial<FormData>) {
  return d.poitrine && d.tailleMes && d.hanches && d.pointure && d.yeux
}

export default function StepMesures({
  data,
  onSubmit,
  onPrev,
}: {
  data:     FormData
  onSubmit: (patch: Partial<FormData>) => void
  onPrev:   () => void
}) {
  const [local, setLocal] = useState({
    poitrine:  data.poitrine,
    tailleMes: data.tailleMes,
    hanches:   data.hanches,
    poids:     data.poids,
    pointure:  data.pointure,
    yeux:      data.yeux,
    cheveux:   data.cheveux,
  })

  const set = (k: keyof typeof local, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      {/* ── GROUPE A : CORPS ─────────────────────── */}
      <GroupLabel>Corps</GroupLabel>
      <div className="flex flex-col gap-[1.1rem] mb-6">

        {/* 3 mensurations principales sur une ligne */}
        <div className="grid grid-cols-3 gap-[.9rem]">
          <Field label="Poitrine cm" required>
            <input type="number" placeholder="88" min="60" max="140"
              className="input-underline" value={local.poitrine}
              onChange={e => set('poitrine', e.target.value)} />
          </Field>
          <Field label="Taille cm" required>
            <input type="number" placeholder="68" min="50" max="120"
              className="input-underline" value={local.tailleMes}
              onChange={e => set('tailleMes', e.target.value)} />
          </Field>
          <Field label="Hanches cm" required>
            <input type="number" placeholder="92" min="60" max="140"
              className="input-underline" value={local.hanches}
              onChange={e => set('hanches', e.target.value)} />
          </Field>
        </div>

        {/* Poids (optionnel) + Pointure */}
        <div className="grid grid-cols-2 gap-[1rem]">
          <Field label="Poids kg" optional>
            <input type="number" placeholder="60" min="35" max="150"
              className="input-underline" value={local.poids}
              onChange={e => set('poids', e.target.value)} />
          </Field>
          <Field label="Pointure" required>
            {/* Select natif restyled — plus léger que shadcn Select pour un seul champ */}
            <select
              className="input-underline"
              value={local.pointure}
              onChange={e => set('pointure', e.target.value)}
              style={{ cursor: 'pointer', paddingRight: '1rem' }}
            >
              <option value="" disabled>— EU</option>
              {POINTURES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── GROUPE B : STYLE ─────────────────────── */}
      <GroupLabel>Apparence</GroupLabel>
      <div className="flex flex-col gap-[1.1rem] mb-6">

        <Field label="Couleur des yeux" required asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.3rem]">
            {YEUX.map(v => (
              <button key={v} type="button"
                className={`chip ${local.yeux === v ? 'active' : ''}`}
                aria-pressed={local.yeux === v}
                onClick={() => set('yeux', v)}
              >
                {v}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Couleur des cheveux" optional asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.3rem]">
            {CHEVEUX.map(v => (
              <button key={v} type="button"
                className={`chip ${local.cheveux === v ? 'active' : ''}`}
                aria-pressed={local.cheveux === v}
                onClick={() => set('cheveux', v)}
              >
                {v}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <CtaButton disabled={!isValid(local)} onClick={() => onSubmit(local)}>
        Envoyer ma candidature
      </CtaButton>
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
