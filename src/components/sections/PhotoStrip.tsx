'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

/* 5 photos en bande horizontale.
   Le container utilise staggerChildren → chaque photo entre avec 80ms de décalage.
   En prod : remplacer les URLs picsum par Supabase Storage. */
const PHOTOS = [
  { seed: 'strip1', alt: 'Mannequin Lumina — portrait éditorial' },
  { seed: 'strip2', alt: 'Mannequin Lumina — mode printemps' },
  { seed: 'strip3', alt: 'Mannequin Lumina — campagne commerciale' },
  { seed: 'strip4', alt: 'Mannequin Lumina — editorial fashion' },
  { seed: 'strip5', alt: 'Mannequin Lumina — lookbook été' },
]

const EASE = [0.16, 1, 0.3, 1] as const

/* stagger : le container déclenche les enfants en cascade */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
/* chaque photo entre par le bas + légère mise à l'échelle */
const photo = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.0, ease: EASE } },
}

export default function PhotoStrip() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '2px',
        background: 'var(--ink)',
      }}
    >
      {PHOTOS.map((p, i) => (
        <motion.div
          key={p.seed}
          variants={photo}
          className="photo-strip-item group"
          style={{
            position: 'relative',
            aspectRatio: '3 / 4',
            overflow: 'hidden',
          }}
        >
          {/* Scale au hover sur le container, jamais sur <Image> directement */}
          <div
            className="photo-strip-inner"
            style={{
              position: 'absolute',
              inset: 0,
              transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <Image
              src={`https://picsum.photos/seed/${p.seed}/500/700`}
              alt={p.alt}
              fill
              sizes="20vw"
              className="object-cover"
              priority={i < 2}
            />
          </div>

          {/* Overlay sombre au hover */}
          <div
            className="photo-strip-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(12,11,9,0)',
              transition: 'background 0.5s ease',
              zIndex: 2,
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
