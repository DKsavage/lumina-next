'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

/* 5 photos en bande horizontale.
   Chaque carte a un ratio portrait 3:4, overflow:hidden pour l'effet scale au hover.
   En prod : remplacer les URLs picsum par Supabase Storage. */
const PHOTOS = [
  { seed: 'strip1', alt: 'Mannequin Lumina — portrait éditorial' },
  { seed: 'strip2', alt: 'Mannequin Lumina — mode printemps' },
  { seed: 'strip3', alt: 'Mannequin Lumina — campagne commerciale' },
  { seed: 'strip4', alt: 'Mannequin Lumina — editorial fashion' },
  { seed: 'strip5', alt: 'Mannequin Lumina — lookbook été' },
]

export default function PhotoStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '2px',
        background: 'var(--ink)',
      }}
    >
      {PHOTOS.map((photo, i) => (
        <div
          key={photo.seed}
          className="photo-strip-item group"
          style={{
            position: 'relative',
            aspectRatio: '3 / 4',
            overflow: 'hidden',
          }}
        >
          {/* Scale up légèrement au hover — transform sur le container,
              pas sur <Image> directement (règle next/image). */}
          <div
            className="photo-strip-inner"
            style={{
              position: 'absolute',
              inset: 0,
              transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <Image
              src={`https://picsum.photos/seed/${photo.seed}/500/700`}
              alt={photo.alt}
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
        </div>
      ))}
    </motion.div>
  )
}
