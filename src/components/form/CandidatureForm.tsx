'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StepPhotos        from './StepPhotos'
import StepProfil        from './StepProfil'
import StepMesures       from './StepMesures'
import StepDisponibilite from './StepDisponibilite'
import Confirmation      from './Confirmation'

/* Transition éditorial vertical — le contenu monte doucement en vue,
   comme un rideau de scène ou une page de magazine qui se révèle. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN  = [0.4, 0, 1, 1]    as const

const VARIANTS = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 20 : -10,
  }),
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: EASE_OUT },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -12 : 8,
    transition: { duration: 0.22, ease: EASE_IN },
  }),
}

const STEPS = ['Photos', 'Profil', 'Mesures', 'Disponibilité']

export type FormData = {
  // Étape 1
  profilFile:      File | null
  bodyFile:        File | null
  prenom:          string
  nom:             string
  email:           string
  telephone:       string
  taille:          string
  genre:           string
  // Étape 2
  ville:           string
  pays:            string
  experience:      string
  instagram:       string
  // Étape 3
  poitrine:        string
  tailleMes:       string
  hanches:         string
  poids:           string
  pointure:        string
  tailleHaut:      string
  tailleBas:       string
  teint:           string
  longueurCheveux: string
  yeux:            string
  cheveux:         string
  // Étape 4
  dateNaissance:   string
  disponibilite:   string
  langues:         string
  aspect:          string
}

const RECAPTCHA_SITE_KEY = '6LddUeAsAAAAAO4fcgYselTJy8a0EBen0SoPookQ'

const EMPTY: FormData = {
  profilFile: null, bodyFile: null,
  prenom: '', nom: '', email: '', telephone: '', taille: '', genre: 'Femme',
  ville: '', pays: '', experience: '', instagram: '',
  poitrine: '', tailleMes: '', hanches: '', poids: '',
  pointure: '', tailleHaut: '', tailleBas: '', teint: '',
  longueurCheveux: '', yeux: '', cheveux: '',
  dateNaissance: '', disponibilite: '', langues: '', aspect: '',
}

/* Convertit un File JS en data URL base64 — seul format sérialisable via JSON.
   FileReader est asynchrone, d'où la Promise wrapper. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader    = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function CandidatureForm() {
  const [step,    setStep]    = useState(0)
  const [dir,     setDir]     = useState(1)
  const [data,    setData]    = useState<FormData>(EMPTY)
  const [done,    setDone]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const s = document.createElement('script')
    s.src   = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    s.async = true
    document.head.appendChild(s)
    return () => { document.head.removeChild(s) }
  }, [])

  const goNext = (patch: Partial<FormData>) => {
    setData(prev => ({ ...prev, ...patch }))
    setDir(1)
    setStep(s => s + 1)
  }

  const goPrev = () => {
    setDir(-1)
    setStep(s => s - 1)
  }

  /* submit est async : convertit les photos en base64, appelle l'API,
     affiche la confirmation seulement si le serveur répond success:true. */
  const submit = async (patch: Partial<FormData>) => {
    const full = { ...data, ...patch }
    setLoading(true)
    setError(null)

    let recaptchaToken = ''
    try {
      type GR = { execute: (k: string, o: { action: string }) => Promise<string> }
      const gr = (window as unknown as { grecaptcha?: GR }).grecaptcha
      if (gr) recaptchaToken = await gr.execute(RECAPTCHA_SITE_KEY, { action: 'submit' })
    } catch { /* script non chargé ou bloqué */ }

    try {
      const [photoProfil, photoBody] = await Promise.all([
        fileToBase64(full.profilFile!),
        fileToBase64(full.bodyFile!),
      ])

      const res = await fetch('/api/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom:          full.prenom,
          nom:             full.nom,
          email:           full.email,
          telephone:       full.telephone,
          taille:          full.taille,
          genre:           full.genre,
          ville:           full.ville,
          pays:            full.pays,
          experience:      full.experience,
          instagram:       full.instagram,
          poitrine:        full.poitrine,
          tailleMes:       full.tailleMes,
          hanches:         full.hanches,
          poids:           full.poids,
          pointure:        full.pointure,
          tailleHaut:      full.tailleHaut,
          tailleBas:       full.tailleBas,
          teint:           full.teint,
          longueurCheveux: full.longueurCheveux,
          yeux:            full.yeux,
          cheveux:         full.cheveux,
          dateNaissance:   full.dateNaissance,
          disponibilite:   full.disponibilite,
          langues:         full.langues,
          aspect:          full.aspect,
          photoProfil,
          photoBody,
          website:        '',  // honeypot — doit être vide
          recaptchaToken,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.message ?? 'Une erreur est survenue. Réessaie dans quelques instants.')
      } else {
        setData(full)
        setDone(true)
      }
    } catch {
      setError('Connexion impossible. Vérifie ta connexion internet et réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
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
            Candidature — Étape {step + 1}/{STEPS.length}
          </span>
          {/* role="status" + aria-live : annonce le nom de la nouvelle étape aux lecteurs d'écran */}
          <span
            role="status"
            aria-live="polite"
            className="font-display italic text-ink"
            style={{ fontSize: '1.5rem', fontWeight: 400, textWrap: 'balance' } as React.CSSProperties}
          >
            {STEPS[step]}
          </span>
        </div>
      )}

      {/* ── STEPPER — barres + numéros, s'adapte automatiquement à STEPS.length ── */}
      {!done && (
        <div
          className="flex gap-[.5rem] mb-10"
          style={{ borderTop: '1px solid rgba(12,11,9,.06)', paddingTop: '.9rem' }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col gap-[.5rem]"
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

      {/* ── CONTENU ANIMÉ ─────────────────────────────── */}
      <div className="relative" style={{ overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          {done ? (
            <motion.div key="done" custom={dir} variants={VARIANTS} initial="enter" animate="center" exit="exit">
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
          ) : step === 2 ? (
            <motion.div key="s2" custom={dir} variants={VARIANTS} initial="enter" animate="center" exit="exit">
              <StepMesures data={data} onNext={goNext} onPrev={goPrev} />
            </motion.div>
          ) : (
            <motion.div key="s3" custom={dir} variants={VARIANTS} initial="enter" animate="center" exit="exit">
              <StepDisponibilite data={data} onSubmit={submit} onPrev={goPrev} loading={loading} error={error} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
