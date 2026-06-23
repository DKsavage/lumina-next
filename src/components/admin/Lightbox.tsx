// Lightbox — photo plein écran avec animation fade entrée/sortie.
// AnimatePresence gère la disparition progressive avant suppression du DOM.
'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

interface Props {
  src:     string
  onClose: () => void
}

export function Lightbox({ src, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: 'rgba(12,11,9,.92)', backdropFilter: 'blur(8px)', cursor: 'zoom-out' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{    scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={src}
          alt="Photo plein écran"
          width={800}
          height={1100}
          className="object-contain"
          style={{ maxWidth: '90vw', maxHeight: '90dvh', width: 'auto', height: 'auto' }}
        />
      </motion.div>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-paper transition-opacity duration-200 hover:opacity-60"
        style={{ background: 'none', fontSize: '1.8rem', lineHeight: 1 }}
        aria-label="Fermer"
      >
        ×
      </button>
    </motion.div>
  )
}
