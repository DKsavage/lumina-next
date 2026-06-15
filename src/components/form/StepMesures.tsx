'use client'

import { useState } from 'react'
import { type FormData } from './CandidatureForm'
import { Field, CtaButton, BackButton } from './StepPhotos'

const YEUX      = ['Marron', 'Noisette', 'Vert', 'Bleu', 'Gris', 'Autre']
const CHEVEUX   = ['Noir', 'Brun', 'Châtain', 'Blond', 'Roux', 'Coloré', 'Autre']
const LONGUEURS = ['Rasé·e', 'Court·e', 'Mi-long·ue', 'Long·ue', 'Très long·ue']
const POINTURES = Array.from({ length: 13 }, (_, i) => String(34 + i)) // 34 → 46
const TAILLES_HAUT = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const TAILLES_BAS  = Array.from({ length: 10 }, (_, i) => String(30 + i * 2)) // 30 → 48
const TEINTS    = ['Très clair', 'Clair', 'Medium', 'Mat', 'Foncé', 'Ébène']

/* Corps + pointure obligatoires — nécessaires pour tout projet ou casting.
   Longueur des cheveux, couleur des cheveux, poids : optionnels. */
function isValid(d: Partial<FormData>) {
  return d.poitrine && d.tailleMes && d.hanches && d.pointure && d.tailleHaut && d.tailleBas && d.teint && d.yeux
}

export default function StepMesures({
  data,
  onNext,
  onPrev,
}: {
  data:   FormData
  onNext: (patch: Partial<FormData>) => void
  onPrev: () => void
}) {
  const [local, setLocal] = useState({
    poitrine:        data.poitrine,
    tailleMes:       data.tailleMes,
    hanches:         data.hanches,
    poids:           data.poids,
    pointure:        data.pointure,
    tailleHaut:      data.tailleHaut,
    tailleBas:       data.tailleBas,
    teint:           data.teint,
    longueurCheveux: data.longueurCheveux,
    yeux:            data.yeux,
    cheveux:         data.cheveux,
  })

  const set = (k: keyof typeof local, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      {/* ── GROUPE A : CORPS ─────────────────────── */}
      <GroupLabel>Corps</GroupLabel>
      <div className="flex flex-col gap-[.75rem] mb-6 form-fields">
        <Field label="Poitrine cm" required inline>
          <input type="number" placeholder="88" min="60" max="140"
            className="input-underline" value={local.poitrine}
            onChange={e => set('poitrine', e.target.value)} />
        </Field>
        <Field label="Tour de taille cm" required inline>
          <input type="number" placeholder="68" min="50" max="120"
            className="input-underline" value={local.tailleMes}
            onChange={e => set('tailleMes', e.target.value)} />
        </Field>
        <Field label="Hanches cm" required inline>
          <input type="number" placeholder="92" min="60" max="140"
            className="input-underline" value={local.hanches}
            onChange={e => set('hanches', e.target.value)} />
        </Field>
        <Field label="Poids kg" optional inline>
          <input type="number" placeholder="60" min="35" max="150"
            className="input-underline" value={local.poids}
            onChange={e => set('poids', e.target.value)} />
        </Field>
        <Field label="Pointure EU" required inline>
          <select className="input-underline" value={local.pointure}
            onChange={e => set('pointure', e.target.value)}
            style={{ cursor: 'pointer', paddingRight: '1rem' }}>
            <option value="" disabled>— EU</option>
            {POINTURES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Haut" required inline>
          <select className="input-underline" value={local.tailleHaut}
            onChange={e => set('tailleHaut', e.target.value)}
            style={{ cursor: 'pointer', paddingRight: '1rem' }}>
            <option value="" disabled>—</option>
            {TAILLES_HAUT.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Pantalon" required inline>
          <select className="input-underline" value={local.tailleBas}
            onChange={e => set('tailleBas', e.target.value)}
            style={{ cursor: 'pointer', paddingRight: '1rem' }}>
            <option value="" disabled>—</option>
            {TAILLES_BAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      {/* ── GROUPE B : APPARENCE ─────────────────── */}
      <GroupLabel>Apparence</GroupLabel>
      <div className="flex flex-col gap-[1.1rem] mb-6 form-fields">

        <Field label="Teint" required inline>
          <select className="input-underline" value={local.teint}
            onChange={e => set('teint', e.target.value)}
            style={{ cursor: 'pointer', paddingRight: '1rem' }}>
            <option value="" disabled>—</option>
            {TEINTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Couleur des yeux" required asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.3rem]">
            {YEUX.map(v => (
              <button key={v} type="button"
                className={`chip ${local.yeux === v ? 'active' : ''}`}
                aria-pressed={local.yeux === v}
                onClick={() => set('yeux', v)}
              >{v}</button>
            ))}
          </div>
        </Field>

        <Field label="Longueur cheveux" optional asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.3rem]">
            {LONGUEURS.map(v => (
              <button key={v} type="button"
                className={`chip ${local.longueurCheveux === v ? 'active' : ''}`}
                aria-pressed={local.longueurCheveux === v}
                onClick={() => set('longueurCheveux', v)}
              >{v}</button>
            ))}
          </div>
        </Field>

        <Field label="Couleur cheveux" optional asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.3rem]">
            {CHEVEUX.map(v => (
              <button key={v} type="button"
                className={`chip ${local.cheveux === v ? 'active' : ''}`}
                aria-pressed={local.cheveux === v}
                onClick={() => set('cheveux', v)}
              >{v}</button>
            ))}
          </div>
        </Field>
      </div>

      <CtaButton disabled={!isValid(local)} onClick={() => onNext(local)}>
        Continuer — Disponibilité
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
