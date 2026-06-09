'use client'

import { useState } from 'react'
import { type FormData } from './CandidatureForm'

const GENRES = ['Femme', 'Homme', 'Non-binaire']

/* Champs requis pour valider et passer à l'étape 2 */
function isValid(d: Partial<FormData>) {
  return d.profilFile && d.bodyFile && d.prenom && d.nom && d.email && d.telephone && d.taille && d.genre
}

export default function StepPhotos({
  data,
  onNext,
}: {
  data: FormData
  onNext: (patch: Partial<FormData>) => void
}) {
  const [local, setLocal] = useState({
    profilFile: data.profilFile,
    bodyFile:   data.bodyFile,
    prenom:     data.prenom,
    nom:        data.nom,
    email:      data.email,
    telephone:  data.telephone,
    taille:     data.taille,
    genre:      data.genre,
  })

  const set = (k: keyof typeof local, v: unknown) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      {/* UPLOAD ZONES */}
      <div className="grid grid-cols-2 gap-[.7rem] mb-5">
        {([
          { key: 'profilFile', label: 'Visage',    sub: 'Portrait clair' },
          { key: 'bodyFile',   label: 'Full body', sub: 'Corps entier'   },
        ] as const).map(({ key, label, sub }) => (
          <label key={key} className="upload-zone flex flex-col items-center gap-[.45rem] p-6">
            <div className="up-ring">{local[key] ? '✓' : '↑'}</div>
            <span
              className="font-medium tracking-[.1em] uppercase text-center relative z-[1]"
              style={{ fontSize: '.58rem', color: local[key] ? 'var(--red)' : 'var(--ink)' }}
            >
              {local[key] ? (local[key] as File).name.slice(0, 14) + '…' : label}
            </span>
            <span className="font-light text-center relative z-[1]" style={{ fontSize: '.52rem', color: 'var(--muted)' }}>
              {sub}
            </span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => set(key, e.target.files?.[0] ?? null)} />
          </label>
        ))}
      </div>

      {/* CHAMPS IDENTITÉ */}
      <div className="flex flex-col gap-[.85rem] mb-5">
        <div className="grid grid-cols-2 gap-[.8rem]">
          <Field label="Prénom" required>
            <input type="text" placeholder="Sophie" className="input-underline"
              value={local.prenom} onChange={e => set('prenom', e.target.value)} />
          </Field>
          <Field label="Nom" required>
            <input type="text" placeholder="Martin" className="input-underline"
              value={local.nom} onChange={e => set('nom', e.target.value)} />
          </Field>
        </div>

        <Field label="Email" required>
          <input type="email" placeholder="sophie@exemple.com" className="input-underline"
            value={local.email} onChange={e => set('email', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-[.8rem]">
          <Field label="Téléphone" required>
            <input type="tel" placeholder="+1 514 …" className="input-underline"
              value={local.telephone} onChange={e => set('telephone', e.target.value)} />
          </Field>
          <Field label="Taille cm" required>
            <input type="number" placeholder="175" min="140" max="210" className="input-underline"
              value={local.taille} onChange={e => set('taille', e.target.value)} />
          </Field>
        </div>

        <Field label="Genre" required>
          <div className="flex gap-[.35rem] flex-wrap pt-[.2rem]">
            {GENRES.map(g => (
              <button key={g} type="button"
                className={`chip ${local.genre === g ? 'active' : ''}`}
                onClick={() => set('genre', g)}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* CTA */}
      <CtaButton disabled={!isValid(local)} onClick={() => onNext(local)}>
        Continuer — Profil
      </CtaButton>

      <Confidentialite />
    </>
  )
}

/* ── Composants partagés entre étapes ── */

export function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-[.3rem]">
      <label className="font-medium tracking-[.22em] uppercase flex gap-1 items-center"
        style={{ fontSize: '.52rem', color: 'rgba(12,11,9,.35)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--red)' }}>*</span>}
        {optional && <span style={{ color: 'rgba(12,11,9,.2)', fontStyle: 'italic', letterSpacing: '.05em', textTransform: 'none' }}>optionnel</span>}
      </label>
      {children}
    </div>
  )
}

export function CtaButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="btn-couture w-full flex items-center justify-between"
      style={{
        padding: '.9rem 1.2rem',
        opacity: disabled ? 0.4 : 1,
        cursor:  disabled ? 'not-allowed' : 'pointer',
        color:   'white',
      }}
    >
      <span className="relative z-[1] font-medium tracking-[.32em] uppercase" style={{ fontSize: '.62rem' }}>
        {children}
      </span>
      <svg className="relative z-[1]" style={{ width: '.9rem', height: '.9rem' }}
        viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </button>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-2 font-medium uppercase"
      style={{
        fontSize: '.52rem', letterSpacing: '.22em', color: 'rgba(12,11,9,.3)',
        padding: '.7rem', marginTop: '.5rem',
        transition: 'color 0.2s',
      }}
    >
      <svg style={{ width: '.8rem', height: '.8rem' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 8H3M7 12l-4-4 4-4" />
      </svg>
      Retour
    </button>
  )
}

export function Confidentialite() {
  return (
    <p className="text-center mt-3 font-light tracking-[.06em]"
      style={{ fontSize: '.5rem', color: 'rgba(12,11,9,.25)' }}
    >
      Confidentialité garantie · Aucun partage tiers
    </p>
  )
}
