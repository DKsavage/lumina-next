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
          <label key={key} className={`upload-zone flex flex-col items-center gap-[.45rem] p-6${local[key] ? ' has-file' : ''}`}>
            {/* aria-hidden : icône décorative, l'info est dans le texte label */}
            <div className="up-ring" aria-hidden="true">{local[key] ? '✓' : '+'}</div>
            <span
              className="font-medium tracking-[.1em] uppercase text-center relative z-[1]"
              style={{ fontSize: '.58rem', color: local[key] ? 'var(--red)' : 'var(--ink)' }}
            >
              {local[key] ? (local[key] as File).name.slice(0, 14) + '…' : label}
            </span>
            {/* Sous-titre en Cormorant italic — contraste Montserrat caps vs display sensoriel */}
            <span className="font-display italic text-center relative z-[1]" style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
              {sub}
            </span>
            {/* sr-only positionné absolument — accessible au clavier et screen readers,
                invisible visuellement. display:none le cacherait aux screen readers. */}
            <input type="file" accept="image/*"
              aria-label={label}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
              onChange={e => set(key, e.target.files?.[0] ?? null)} />
          </label>
        ))}
      </div>

      {/* CHAMPS IDENTITÉ — inline : label gauche, input droite sur même baseline */}
      <div className="flex flex-col gap-[1rem] mb-5 form-fields">
        <Field label="Prénom" required inline>
          <input type="text" placeholder="Sophie" className="input-underline"
            value={local.prenom} onChange={e => set('prenom', e.target.value)} />
        </Field>

        <Field label="Nom" required inline>
          <input type="text" placeholder="Martin" className="input-underline"
            value={local.nom} onChange={e => set('nom', e.target.value)} />
        </Field>

        <Field label="Email" required inline>
          <input type="email" placeholder="sophie@exemple.com" className="input-underline"
            value={local.email} onChange={e => set('email', e.target.value)} />
        </Field>

        <Field label="Téléphone" required inline>
          <input type="tel" placeholder="+1 514 …" className="input-underline"
            value={local.telephone} onChange={e => set('telephone', e.target.value)} />
        </Field>

        <Field label="Taille cm" required inline>
          <input type="number" placeholder="175" min="140" max="210" className="input-underline"
            value={local.taille} onChange={e => set('taille', e.target.value)} />
        </Field>

        <Field label="Genre" required asGroup>
          <div className="flex gap-[.35rem] flex-wrap pt-[.2rem]">
            {GENRES.map(g => (
              <button key={g} type="button"
                className={`chip ${local.genre === g ? 'active' : ''}`}
                aria-pressed={local.genre === g}
                onClick={() => set('genre', g)}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* CTA + note confidentialité dans le bloc sticky */}
      <CtaButton disabled={!isValid(local)} onClick={() => onNext(local)}>
        Continuer — Profil
      </CtaButton>
    </>
  )
}

/* ── Composants partagés entre étapes ── */

export function Field({
  label,
  required,
  optional,
  children,
  asGroup = false,
  inline  = false,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
  asGroup?: boolean
  inline?:  boolean
}) {
  const labelText = (
    <>
      {label}
      {/* aria-hidden sur * : l'astérisque est décoratif, l'info "requis" vient de aria-label du groupe */}
      {required  && <span aria-hidden="true" style={{ color: 'var(--red)' }}>*</span>}
      {optional  && <span style={{ color: 'rgba(12,11,9,.35)', fontStyle: 'italic', letterSpacing: '.05em', textTransform: 'none' }}>optionnel</span>}
    </>
  )
  const cls   = "font-medium tracking-[.22em] uppercase flex gap-1 items-center"
  const style = { fontSize: '.65rem', color: 'rgba(12,11,9,.55)' } as const

  /* Mode inline : label à gauche + input à droite sur la même baseline.
     Disposition editorial — label visible sans doubler la hauteur du champ. */
  if (inline) {
    return (
      <label className="flex items-baseline gap-3">
        <span
          className="font-medium uppercase tracking-[.18em] flex gap-[.18em] items-center flex-shrink-0"
          style={{ fontSize: '.52rem', color: 'rgba(12,11,9,.38)', minWidth: '5rem' }}
        >
          {labelText}
        </span>
        <div className="flex-1">{children}</div>
      </label>
    )
  }

  /* Groupe de boutons (chips) — role="group" + aria-label au lieu de <label htmlFor> */
  if (asGroup) {
    return (
      <div
        className="flex flex-col gap-[.5rem]"
        role="group"
        aria-label={`${label}${required ? ' (requis)' : ''}`}
      >
        <span className={cls} style={style}>{labelText}</span>
        {children}
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-[.5rem]">
      <span className={cls} style={style}>{labelText}</span>
      {children}
    </label>
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
  /* shake : auto-géré dans le composant — pas besoin de remonter l'état.
     aria-disabled remplace disabled pour que le click soit toujours captable. */
  const [shaking, setShaking] = useState(false)

  const handleClick = () => {
    if (disabled) {
      setShaking(true)
      setTimeout(() => setShaking(false), 480)
      return
    }
    onClick?.()
  }

  return (
    /* form-cta : sticky en bas de la carte sur mobile, static sur desktop.
       Fondu blanc au-dessus pour signaler qu'il y a du contenu à scroller. */
    <div className="form-cta">
      <button
        type="button"
        aria-disabled={disabled}
        onClick={handleClick}
        className={`btn-couture w-full flex items-center justify-between${shaking ? ' shake' : ''}`}
        style={{
          padding: '.75rem .75rem .75rem 1.4rem',
          opacity: disabled ? 0.38 : 1,
          cursor:  disabled ? 'not-allowed' : 'pointer',
          color:   'white',
        }}
      >
        <span className="relative z-[1] font-medium tracking-[.32em] uppercase" style={{ fontSize: '.58rem' }}>
          {children}
        </span>
        {/* Cercle flottant — button-in-button (high-end-visual-design) */}
        <span className="btn-circle" aria-hidden="true">
          <svg style={{ width: '.75rem', height: '.75rem' }}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </span>
      </button>
      <p className="text-center mt-3 font-light tracking-[.06em]"
        style={{ fontSize: '.48rem', color: 'rgba(12,11,9,.22)' }}>
        Confidentialité garantie · Aucun partage tiers
      </p>
    </div>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-2 font-medium uppercase active:scale-[0.96]"
      style={{
        fontSize: '.52rem', letterSpacing: '.22em', color: 'rgba(12,11,9,.3)',
        minHeight: '44px', padding: '.7rem', marginTop: '.5rem',
        transition: 'color 0.2s, transform 0.15s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <svg aria-hidden="true" style={{ width: '.8rem', height: '.8rem' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
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
