'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'

const SLIDES = [
  { seed: 'couA', pos: 'center 20%', alt: 'Mannequin Lumina — portrait éditorial' },
  { seed: 'couB', pos: 'center 15%', alt: 'Mannequin Lumina — pose mode' },
  { seed: 'couC', pos: 'center top', alt: 'Mannequin Lumina — shooting commercial' },
  { seed: 'couD', pos: '60% 10%',   alt: 'Mannequin Lumina — campagne mode' },
  { seed: 'couE', pos: 'center 25%', alt: 'Mannequin Lumina — casting' },
]

interface Props {
  current: number
  onAdvance: () => void
}

/* PhotoSlideshow est maintenant un composant contrôlé.
   Le parent (HeroSplit) gère l'état current et les dots.
   onAdvance() est appelé par le timer pour auto-avancer. */
export default function PhotoSlideshow({ current, onAdvance }: Props) {
  /* Ref pour éviter que onAdvance soit une dépendance du setInterval.
     Sans ça, le timer redémarre à chaque render → boucle infinie. */
  const onAdvanceRef = useRef(onAdvance)
  useEffect(() => { onAdvanceRef.current = onAdvance }, [onAdvance])

  /* Timer auto-avance toutes les 5s — démarre une seule fois au montage.
     Ken Burns dure 14s en alternate → chaque slide montre un fragment
     différent de son animation. Découplement intentionnel : cinématique naturelle. */
  useEffect(() => {
    const timer = setInterval(() => onAdvanceRef.current(), 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    /* absolute inset-0 : remplit le parent positionné (HeroSplit <div absolute inset-0>) */
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'var(--ink)' }}>
      {SLIDES.map((slide, i) => (
        <div
          key={slide.seed}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)' }}
        >
          {/* ken-burns-N anime le CONTENEUR — jamais next/image directement.
              GPU-safe : transform uniquement, will-change pré-alloue le layer. */}
          <div className={`ken-burns-${i + 1} absolute inset-0`}>
            <Image
              src={`https://picsum.photos/seed/${slide.seed}/900/1300`}
              alt={slide.alt}
              fill
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: slide.pos }}
              priority={i === 0}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
