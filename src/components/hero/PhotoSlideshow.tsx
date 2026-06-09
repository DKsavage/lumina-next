'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

/* Photos placeholder — seeds stables, même image à chaque reload.
   En prod : remplacer par les URLs Supabase Storage de l'agence. */
const SLIDES = [
  { seed: 'couA', pos: 'center 20%', alt: 'Mannequin Lumina — portrait éditorial' },
  { seed: 'couB', pos: 'center 15%', alt: 'Mannequin Lumina — pose mode' },
  { seed: 'couC', pos: 'center top', alt: 'Mannequin Lumina — shooting commercial' },
  { seed: 'couD', pos: '60% 10%',   alt: 'Mannequin Lumina — campagne mode' },
  { seed: 'couE', pos: 'center 25%', alt: 'Mannequin Lumina — casting' },
]

export default function PhotoSlideshow() {
  const [current, setCurrent] = useState(0)

  /* 5 000 ms = 5s par slide.
     Ken Burns dure 14s en alternate → chaque slide montre un fragment
     différent de son animation. Découplement intentionnel : cinématique naturelle. */
  useEffect(() => {
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % SLIDES.length), 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative overflow-hidden" style={{ background: 'var(--ink)', minHeight: '100dvh' }}>

      {SLIDES.map((slide, i) => (
        <div
          key={slide.seed}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)' }}
        >
          {/* ken-burns-N anime le CONTENEUR — jamais next/image directement.
              Raison : next/image gère son layout interne, animer son transform
              casserait l'affichage. GPU-safe : transform only. */}
          <div className={`ken-burns-${i + 1} absolute inset-0`}>
            <Image
              src={`https://picsum.photos/seed/${slide.seed}/900/1300`}
              alt={slide.alt}
              fill
              sizes="(max-width: 767px) 100vw, 52vw"
              className="object-cover"
              style={{ objectPosition: slide.pos }}
              priority={i === 0}
            />
          </div>
        </div>
      ))}

      {/* Vignette overlay — bords sombres, gradient bas */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: `
            linear-gradient(to right,  rgba(247,243,238,.12) 0%, transparent 18%),
            linear-gradient(to bottom, rgba(12,11,9,.12) 0%, transparent 25%, transparent 65%, rgba(12,11,9,.5) 100%)
          `,
        }}
      />

      {/* Compteur + dots — bas droite, desktop uniquement
          Sur mobile ils sont cachés : le form en bottom-sheet les couvre. */}
      <div className="absolute bottom-10 right-10 z-10 hidden md:flex flex-col items-end gap-3">
        <span
          className="font-display italic tabular-nums"
          style={{ fontSize: '2.5rem', fontWeight: 300, color: 'rgba(255,255,255,.12)', lineHeight: 1 }}
        >
          {String(current + 1).padStart(2, '0')}
        </span>
        <div className="flex gap-[.35rem] items-center">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Photo ${i + 1}`}
              className="h-[1.5px] transition-all duration-[400ms]"
              style={{
                width: i === current ? '2.2rem' : '1.2rem',
                background: i === current ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.18)',
                transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
              }}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
