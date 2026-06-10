'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StepPhotos    from './StepPhotos'
import StepProfil    from './StepProfil'
import StepMesures   from './StepMesures'
import Confirmation  from './Confirmation'

/* Direction de la transition :
   - Avancer (next) : ancienne étape part à gauche, nouvelle arrive de droite
   - Reculer (prev) : ancienne part à droite, nouvelle arrive de gauche
   Timing : enter 280ms ease-out (< 300ms, 12-principles), exit 180ms ease-in */
const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN  = [0.4, 0, 1, 1]    as const

const VARIANTS = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-60%' : '60%',
    opacity: 0,
    transition: { duration: 0.18, ease: EASE_IN },
  }),
}

const STEPS = ['Photos', 'Profil', 'Mesures']

export type FormData = {
  // Étape 1
  profilFile:  File | null
  bodyFile:    File | null
  prenom:      string
  nom:         string
  email:       string
  telephone:   string
  taille:      string
  genre:       string
  // Étape 2
  ville:       string
  experience:  string
  instagram:   string
  // Étape 3
  poitrine:    string
  tailleMes:   string
  hanches:     string
  poids:       string
  pointure:    string
  yeux:        string
  cheveux:     string
}

const EMPTY: FormData = {
  profilFile: null, bodyFile: null,
  prenom: '', nom: '', email: '', telephone: '', taille: '', genre: 'Femme',
  ville: '', experience: '', instagram: '',
  poitrine: '', tailleMes: '', hanches: '', poids: '', pointure: '', yeux: '', cheveux: '',
}

export default function CandidatureForm() {
  const [step, setStep]   = useState(0)
  const [dir,  setDir]    = useState(1)
  const [data, setData]   = useState<FormData>(EMPTY)
  const [done, setDone]   = useState(false)

  const goNext = (patch: Partial<FormData>) => {
    setData(prev => ({ ...prev, ...patch }))
    setDir(1)
    setStep(s => s + 1)
  }

  const goPrev = () => {
    setDir(-1)
    setStep(s => s - 1)
  }

  const submit = (patch: Partial<FormData>) => {
    setData(prev => ({ ...prev, ...patch }))
    setDone(true)
  }

  /* Progression 0-100 pour la barre */
  const progress = done ? 100 : Math.round((step / STEPS.length) * 100)

  return (
    /* lum-form-card : fond papier, bordure rouge en tête, border-radius mobile
       (1rem 1rem 0 0 = bottom-sheet arrondi en haut), 0 sur desktop (Couture Blanche).
       La classe contient position:relative + overflow:hidden pour l'animation des étapes. */
    <div className="lum-form-card">
      {/* Poignée décorative bottom-sheet — cachée sur desktop via CSS */}
      <div className="sheet-handle" aria-hidden="true" />
      {/* ── EN-TÊTE ─────────────────────────────────────── */}
      {!done && (
        <div className="flex items-baseline justify-between mb-4">
          <span
            className="font-medium tracking-[.3em] uppercase"
            style={{ fontSize: '.52rem', color: 'var(--red)' }}
          >
            Candidature — Étape {step + 1}/3
          </span>
          {/* role="status" + aria-live : annonce le nom de la nouvelle étape aux screen readers */}
          <span role="status" aria-live="polite" className="font-display italic text-ink" style={{ fontSize: '1.5rem', fontWeight: 400, textWrap: 'balance' } as React.CSSProperties}>
            {STEPS[step]}
          </span>
        </div>
      )}

      {/* ── BARRE DE PROGRESSION ──────────────────────────
           3 barres + numéros. Le nom d'étape vit dans l'en-tête
           (italic display) — pas besoin de le répéter ici. */}
      {!done && (
        /* Règle de séparation fine avant le stepper — détail éditorial luxe */
        <div className="flex gap-[.5rem] mb-10" style={{ borderTop: '1px solid rgba(12,11,9,.06)', paddingTop: '.9rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 flex flex-col gap-[.5rem]"
              aria-current={i === step ? 'step' : undefined}
            >
              <div
                className="h-[2px] w-full transition-colors duration-500"
                style={{
                  background: i <= step ? 'var(--red)' : 'rgba(12,11,9,.1)',
                  transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                }}
              />
              <span
                className="font-medium"
                style={{
                  fontSize: '.6rem',
                  letterSpacing: '.1em',
                  fontVariantNumeric: 'tabular-nums',
                  color: i <= step ? 'var(--red)' : 'rgba(12,11,9,.2)',
                }}
              >
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTENU ANIMÉ ───────────────────────────────── */}
      {/* overflow:hidden sur le parent clip les slides qui arrivent/partent */}
      <div className="relative" style={{ overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          {done ? (
            <motion.div
              key="done"
              custom={dir}
              variants={VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Confirmation email={data.email} prenom={data.prenom} />
            </motion.div>
          ) : step === 0 ? (
            <motion.div key="s0" custom={dir} variants={VARIANTS} initial="enter" animate="center" exit="exit">
              <StepPhotos data={data} onNext={goNext} />
            </motion.div>
          ) : step === 1 ? (
            <motion.div key="s1" custom={dir} variants={VARIANTS} initial="enter" animate="center" exit="exit">
              <StepProfil data={data} onNext={goNext} onPrev={goPrev} />
            </motion.div>
          ) : (
            <motion.div key="s2" custom={dir} variants={VARIANTS} initial="enter" animate="center" exit="exit">
              <StepMesures data={data} onSubmit={submit} onPrev={goPrev} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
