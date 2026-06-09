'use client'

import { motion } from 'framer-motion'

/* Confirmation inline — dans le même panneau (pas de page séparée).
   Animation : check rouge grandit depuis scale(0.8) → scale(1), puis le texte slide up. */
export default function Confirmation({
  email,
  prenom,
}: {
  email:  string
  prenom: string
}) {
  return (
    <div className="flex flex-col items-center text-center py-6" style={{ gap: '1.2rem' }}>

      {/* Cercle check animé */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '3rem',
          height: '3rem',
          border: '1.5px solid var(--red)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--red)',
        }}
      >
        {/* Checkmark SVG */}
        <motion.svg
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '1.1rem', height: '1.1rem' }}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <motion.path
            d="M3 8l3.5 3.5L13 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.svg>
      </motion.div>

      {/* Titre */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="font-display italic font-light"
          style={{ fontSize: '1.4rem', color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.1 }}
        >
          Merci, {prenom || 'merci'}<em style={{ color: 'var(--red)', fontStyle: 'normal' }}>.</em>
        </div>
      </motion.div>

      {/* Corps */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="font-light leading-[1.8]"
        style={{ fontSize: '.75rem', color: 'var(--muted)', maxWidth: '240px' }}
      >
        Ta candidature a été reçue. Notre directrice artistique examinera ton profil et te répondra sous cinq jours ouvrables.
      </motion.p>

      {/* Email de confirmation */}
      {email && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: '.52rem',
            color: 'rgba(12,11,9,.3)',
            fontWeight: 500,
            letterSpacing: '.12em',
            borderTop: '1px solid var(--ivory)',
            paddingTop: '.8rem',
            width: '100%',
            textAlign: 'center',
          }}
        >
          Confirmation envoyée à <span style={{ color: 'var(--ink)' }}>{email}</span>
        </motion.div>
      )}
    </div>
  )
}
