'use client'

import { useState, useEffect } from 'react'
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

  /* previews : URL blob locales créées par URL.createObjectURL().
     Elles ne quittent pas le navigateur et sont révoquées à chaque remplacement
     pour éviter les fuites mémoire (revokeObjectURL). */
  const [previews, setPreviews] = useState<{ profilFile: string; bodyFile: string }>({
    profilFile: '', bodyFile: '',
  })

  useEffect(() => {
    return () => {
      if (previews.profilFile) URL.revokeObjectURL(previews.profilFile)
      if (previews.bodyFile)   URL.revokeObjectURL(previews.bodyFile)
    }
    // Nettoyage uniquement au démontage du composant — pas à chaque changement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFile = (key: 'profilFile' | 'bodyFile', file: File | null) => {
    setLocal(prev => ({ ...prev, [key]: file }))
    setPreviews(prev => {
      if (prev[key]) URL.revokeObjectURL(prev[key])
      return { ...prev, [key]: file ? URL.createObjectURL(file) : '' }
    })
  }

  const set = (k: Exclude<keyof typeof local, 'profilFile' | 'bodyFile'>, v: unknown) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  return (
    <>
      {/* UPLOAD ZONES — affiche la photo sélectionnée comme fond de zone */}
      <div className="grid grid-cols-2 gap-[.7rem] mb-5">
        {([
          { key: 'profilFile' as const, label: 'Visage',    sub: 'Portrait clair' },
          { key: 'bodyFile'   as const, label: 'Full body', sub: 'Corps entier'   },
        ]).map(({ key, label, sub }) => {
          const hasPreview = !!previews[key]
          return (
            <label
              key={key}
              className={`upload-zone flex flex-col items-center gap-[.45rem] p-6${local[key] ? ' has-file' : ''}`}
              style={hasPreview ? {
                backgroundImage:    `url(${previews[key]})`,
                backgroundSize:     'cover',
                backgroundPosition: 'center top',
              } : undefined}
            >
              {/* aria-hidden : icône décorative, l'info est dans le texte label */}
              <div className="up-ring" aria-hidden="true">
                {local[key] ? (
                  /* Check SVG — plus précis que le caractère ✓ */
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ width: '.7rem', height: '.7rem', flexShrink: 0 }}>
                    <path d="M3 8.5l3.5 3.5 6.5-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  /* Plus SVG — plus fin que le + ASCII */
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                    style={{ width: '.7rem', height: '.7rem', flexShrink: 0 }}>
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* Quand la photo est chargée : label original + "Modifier" en sous-titre */}
              <span
                className="font-medium tracking-[.1em] uppercase text-center relative z-[1]"
                style={{ fontSize: '.58rem', color: hasPreview ? 'rgba(247,243,238,.9)' : (local[key] ? 'var(--red)' : 'var(--ink)') }}
              >
                {label}
              </span>
              <span
                className="font-display italic text-center relative z-[1]"
                style={{ fontSize: '.72rem', color: hasPreview ? 'rgba(247,243,238,.45)' : 'var(--muted)' }}
              >
                {hasPreview ? 'Modifier ↺' : sub}
              </span>

              <input type="file" accept="image/*"
                aria-label={`${label}${local[key] ? ' — modifier la photo' : ''}`}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                onChange={e => handleFile(key, e.target.files?.[0] ?? null)} />
            </label>
          )
        })}
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
          <input type="tel" placeholder="+1 234 567 8900" className="input-underline"
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
  loading = false,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  loading?: boolean
}) {
  /* shake : auto-géré dans le composant — pas besoin de remonter l'état.
     aria-disabled remplace disabled pour que le click soit toujours captable.
     Pas de shake quand loading : l'envoi est déjà en cours. */
  const [shaking, setShaking] = useState(false)

  const handleClick = () => {
    if (loading) return
    if (disabled) {
      setShaking(true)
      setTimeout(() => setShaking(false), 480)
      return
    }
    onClick?.()
  }

  const isBlocked = disabled || loading

  return (
    /* form-cta : sticky en bas de la carte sur mobile, static sur desktop.
       Fondu blanc au-dessus pour signaler qu'il y a du contenu à scroller. */
    <div className="form-cta">
      <button
        type="button"
        aria-disabled={isBlocked}
        aria-busy={loading}
        onClick={handleClick}
        className={`btn-couture w-full flex items-center justify-between${shaking ? ' shake' : ''}`}
        style={{
          padding: '.75rem .75rem .75rem 1.4rem',
          opacity: isBlocked ? 0.48 : 1,
          cursor:  isBlocked ? (loading ? 'wait' : 'not-allowed') : 'pointer',
          color:   'white',
        }}
      >
        <span className="relative z-[1] font-medium tracking-[.32em] uppercase" style={{ fontSize: '.58rem' }}>
          {loading ? 'Envoi en cours…' : children}
        </span>
        {/* Cercle flottant — button-in-button (high-end-visual-design).
            Loading : spinner rotatif à la place de la flèche. */}
        <span className="btn-circle" aria-hidden="true">
          {loading ? (
            <span style={{
              display: 'block',
              width: '.75rem', height: '.75rem',
              border: '1.5px solid rgba(255,255,255,.35)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
            }} />
          ) : (
            <svg style={{ width: '.75rem', height: '.75rem' }}
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
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
