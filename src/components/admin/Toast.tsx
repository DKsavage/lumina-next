// Toast — notification temporaire animée (fade + glisse vers le bas à la sortie).
// AnimatePresence gère l'animation de sortie avant que React retire le composant du DOM.
'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  message: string
}

export function Toast({ message }: Props) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y: -4 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          className="fixed top-6 left-1/2 z-[300] font-medium"
          style={{
            x:            '-50%',
            fontFamily:   "'Montserrat', sans-serif",
            fontSize:     '.62rem',
            letterSpacing: '.08em',
            background:   'var(--ink)',
            color:        'var(--paper)',
            padding:      '.75rem 1.5rem',
            boxShadow:    '0 4px 24px rgba(0,0,0,.18)',
            whiteSpace:   'nowrap',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
