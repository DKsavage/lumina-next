'use client'

import { motion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

/* Écran de confirmation inline.
   Séquence temporelle :
   0.0s — eyebrow "Candidature reçue"
   0.2s — cercle check (scale) + tracé du chemin SVG à 0.45s
   0.55s — prénom Cormorant, révélation depuis le centre
   0.9s  — règle rouge qui s'étire
   1.0s  — corps du texte
   1.15s — email de confirmation */
export default function Confirmation({
  email,
  prenom,
}: {
  email:  string
  prenom: string
}) {
  return (
    <div className="flex flex-col items-center text-center" style={{ gap: '1.4rem', padding: '2rem 0 1rem' }}>

      {/* Eyebrow — premier élément visible */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="font-medium uppercase"
        style={{ fontSize: '.52rem', letterSpacing: '.35em', color: 'var(--red)' }}
      >
        Candidature reçue
      </motion.div>

      {/* Cercle check — scale depuis 0.7, puis le chemin SVG se trace */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
        style={{
          width: '2.8rem', height: '2.8rem',
          border: '1px solid var(--red)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--red)',
          flexShrink: 0,
        }}
      >
        <svg
          style={{ width: '1rem', height: '1rem' }}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <motion.path
            d="M3 8l3.5 3.5L13 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
          />
        </svg>
      </motion.div>

      {/* Prénom — Cormorant grand format.
          clip-path : inset(0 50% 0 50%) = tout masqué depuis les deux côtés.
          L'animation vers inset(0 0% 0 0%) révèle le texte en "rideau s'ouvrant". */}
      <div style={{ overflow: 'hidden' }}>
        <motion.div
          initial={{ clipPath: 'inset(0 50% 0 50%)' }}
          animate={{ clipPath: 'inset(0 0% 0 0%)' }}
          transition={{ duration: 0.75, delay: 0.55, ease: EASE }}
          className="font-display italic font-light"
          style={{
            fontSize: 'clamp(2.2rem, 10vw, 3rem)',
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {prenom || 'Merci'}<em style={{ color: 'var(--red)', fontStyle: 'normal' }}>.</em>
        </motion.div>
      </div>

      {/* Règle rouge — s'étire depuis le centre vers les bords (scaleX 0 → 1) */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.4 }}
        transition={{ duration: 0.7, delay: 0.9, ease: EASE }}
        style={{
          height: '1px',
          width: '2.5rem',
          background: 'var(--red)',
          transformOrigin: 'center',
        }}
      />

      {/* Corps */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0, ease: EASE }}
        className="font-light leading-[1.85]"
        style={{ fontSize: '.75rem', color: 'var(--muted)', maxWidth: '220px' }}
      >
        Notre directrice artistique examine ton profil et te répondra sous cinq jours ouvrables.
      </motion.p>

      {/* Email de confirmation */}
      {email && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.15, ease: EASE }}
          style={{
            fontSize: '.52rem',
            color: 'rgba(12,11,9,.3)',
            fontWeight: 500,
            letterSpacing: '.12em',
            borderTop: '1px solid var(--ivory)',
            paddingTop: '.8rem',
            width: '100%',
          }}
        >
          Confirmation envoyée à{' '}
          <span style={{ color: 'var(--ink)' }}>{email}</span>
        </motion.div>
      )}
    </div>
  )
}
