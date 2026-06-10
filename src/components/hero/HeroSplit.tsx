'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import CandidatureForm from '../form/CandidatureForm'

const SLIDES = [
  { seed: 'lumA', pos: 'center 20%', alt: 'Mannequin Lumina — portrait éditorial' },
  { seed: 'lumB', pos: 'center 15%', alt: 'Mannequin Lumina — pose mode' },
  { seed: 'lumC', pos: 'center top', alt: 'Mannequin Lumina — shooting commercial' },
  { seed: 'lumD', pos: '60% 10%',   alt: 'Mannequin Lumina — campagne mode' },
  { seed: 'lumE', pos: 'center 25%', alt: 'Mannequin Lumina — casting 2026' },
]

export default function HeroSplit() {
  const [current, setCurrent] = useState(0)

  /* setInterval toutes les 5s pour synchroniser le compteur avec le CSS.
     Le slideshow visuel est 100% CSS (@keyframes show + animation-delay staggeré).
     Ici on ne pilote QUE les chiffres et les points — pas les transitions d'images. */
  useEffect(() => {
    const timer = setInterval(
      () => setCurrent(prev => (prev + 1) % SLIDES.length),
      5000,
    )
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      {/* ══ NAV — position: fixed, z-index: 500 ══ */}
      <nav className="lum-nav">
        <a href="#" className="lum-logo" aria-label="Lumina Photography">
          <div className="logo-mark" aria-hidden="true">
            <span>L</span>
          </div>
          <span className="logo-word">Lumina<em>.</em></span>
        </a>
        <nav className="lum-nav-links" aria-label="Navigation principale">
          <a href="#" className="lum-nav-link">L&apos;agence</a>
          <a href="#" className="lum-nav-link">Processus</a>
        </nav>
      </nav>

      {/* ══ HERO CONTAINER — position: relative pour contenir slideshow + overlay ══
          overflow: hidden coupe les images Ken Burns qui sortent du cadre.
          min-height: 100dvh = hauteur plein écran (dvh = dynamic viewport height,
          évite le bug iOS Safari où 100vh inclut la barre d'URL). */}
      <div
        style={{
          position: 'relative',
          minHeight: '100dvh',
          overflow: 'hidden',
          background: 'var(--ink)',
        }}
      >
        {/* ── SLIDESHOW CSS-only ──
            5 divs .lum-slide positionnées absolues.
            Chaque slide a animation: show 25s + kenBurns 25s avec un delay de N×5s.
            Résultat : une slide devient visible toutes les 5s, sans JS. */}
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', isolation: 'isolate' }}
          aria-hidden="true"
        >
          {SLIDES.map((slide, i) => (
            <div key={slide.seed} className="lum-slide">
              <Image
                src={`https://picsum.photos/seed/${slide.seed}/1200/1600`}
                alt={slide.alt}
                fill
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: slide.pos }}
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {/* ── OVERLAY — dégradé sombre sur la photo, z-index: 1 ── */}
        <div className="lum-overlay" aria-hidden="true" />

        {/* ── SECTION HERO ── */}
        <section className="lum-hero" id="apply">

          {/* MOBILE ONLY: espace atmosphérique — révèle le Ken Burns au-dessus du formulaire.
              Caché sur desktop via CSS (.lum-mobile-atmosphere { display: none } dans @media 768px+). */}
          <div className="lum-mobile-atmosphere">
            <div className="lum-eyebrow">
              <span className="lum-dash" aria-hidden="true">———</span>
              Casting ouvert · Montréal 2026
              <span className="lum-dash" aria-hidden="true">———</span>
            </div>
          </div>

          {/* FORM SHELL — Option C : form plein focus, titre supprimé */}
          <div className="lum-shell">
            <CandidatureForm />
          </div>

        </section>
      </div>

      {/* ══ COMPTEUR PHOTO ══
          position: fixed, z-index: 20 (au-dessus de tout sauf nav).
          Caché sur mobile via CSS (.lum-counter { display: none } dans @media mobile).
          Le compteur synchronise avec le CSS slideshow via le setInterval ci-dessus. */}
      <div className="lum-counter" aria-hidden="true">
        <span className="lum-num">
          {String(current + 1).padStart(2, '0')}
        </span>
        <span className="lum-total">/ 05</span>
        <div className="lum-dots">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`lum-dot${i === current ? ' active' : ''}`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
