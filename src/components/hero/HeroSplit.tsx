'use client'

/* Client Component : useEffect pour déclencher les reveals CSS au montage. */
import { useEffect, useState } from 'react'
import PhotoSlideshow from './PhotoSlideshow'
import CandidatureForm from '../form/CandidatureForm'

export default function HeroSplit() {
  /* visible → true après 80ms : déclenche tous les reveals CSS.
     Délai court pour éviter le flash où les éléments sont déjà
     en place avant que React ait fini de monter le DOM. */
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* ── NAV FIXE ──────────────────────────────────────────────── */}
      {/* hero-nav : transparent sur mobile (fond photo), gradient papier sur desktop */}
      <nav
        className="hero-nav fixed top-0 left-0 right-0 z-[500] flex items-center justify-between px-6 md:px-14"
        style={{ paddingTop: '1.8rem', paddingBottom: '1.8rem' }}
      >
        <a href="#" className="font-display font-semibold uppercase no-underline" style={{ fontSize: '.95rem', letterSpacing: '.45em' }}>
          {/* Couleur adaptée : blanc sur fond photo (mobile), encre sur fond papier (desktop) */}
          <span className="text-white md:text-ink">Lumina</span>
          <em className="text-red not-italic">.</em>
        </a>

        {/* Liens nav — desktop uniquement */}
        <div className="hidden md:flex items-center" style={{ gap: '3rem' }}>
          <a href="#process" className="nav-link font-medium uppercase text-muted" style={{ fontSize: '.58rem', letterSpacing: '.28em' }}>Processus</a>
          <a href="#why"     className="nav-link font-medium uppercase text-muted" style={{ fontSize: '.58rem', letterSpacing: '.28em' }}>L&rsquo;agence</a>
          <a
            href="#apply"
            className="font-medium uppercase text-red transition-colors duration-300 hover:bg-red hover:text-white"
            style={{ fontSize: '.58rem', letterSpacing: '.28em', border: '1px solid rgba(139,0,32,.3)', padding: '.5rem 1.4rem' }}
          >
            Candidater
          </a>
        </div>
      </nav>

      {/* Texte vertical — desktop uniquement */}
      <span className="vert-label hidden md:block">Lumina Photography · Casting 2026</span>

      {/* ══════════════════════════════════════════════════════════════
          HERO
          Mobile  : photo plein-écran en fond, titre centré, form en bas
          Desktop : grid 48/52 — texte+form gauche, photo droite
      ══════════════════════════════════════════════════════════════ */}
      <section id="apply" className="relative" style={{ minHeight: '100dvh', borderBottom: '1px solid var(--border)' }}>

        {/* ── MOBILE — photo plein écran derrière tout ── */}
        <div className="absolute inset-0 md:hidden overflow-hidden">
          <PhotoSlideshow />
        </div>

        {/* Overlay sombre sur la photo — assombrit pour lisibilité du texte */}
        <div
          className="absolute inset-0 md:hidden pointer-events-none z-[1]"
          style={{
            background: `
              radial-gradient(ellipse 100% 70% at 50% 28%, transparent 8%, rgba(12,11,9,.38) 100%),
              linear-gradient(to bottom, rgba(12,11,9,.52) 0%, rgba(12,11,9,.04) 22%, rgba(12,11,9,.18) 52%, rgba(12,11,9,.92) 100%)
            `,
          }}
        />

        {/* ── MOBILE CONTENT ── */}
        <div
          className="md:hidden relative z-10 flex flex-col"
          style={{ minHeight: '100dvh', paddingTop: '5.5rem' }}
        >
          {/* Bloc titre centré */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 pb-6">

            {/* Eyebrow pill */}
            <div
              className={`reveal ${visible ? 'in' : ''} font-medium uppercase`}
              style={{
                fontSize: '.44rem', letterSpacing: '.35em', transitionDelay: '.1s',
                color: 'rgba(247,243,238,.5)',
                border: '1px solid rgba(247,243,238,.15)', borderRadius: '99px',
                padding: '.38rem 1.1rem', display: 'inline-block',
              }}
            >
              Casting ouvert · Montréal 2026
            </div>

            {/* Titre principal */}
            <h1
              className={`reveal font-display font-light ${visible ? 'in' : ''}`}
              style={{
                fontSize: 'clamp(3.5rem, 15vw, 6rem)', lineHeight: .98,
                letterSpacing: '-.025em', color: 'rgba(247,243,238,.95)',
                textWrap: 'balance', transitionDelay: '.22s',
              }}
            >
              Votre <em className="text-red italic">lumière.</em><br />
              Notre <em className="text-red italic">regard.</em>
            </h1>

            {/* Filet champagne */}
            <div
              className={`reveal ${visible ? 'in' : ''}`}
              style={{
                width: '2.5rem', height: '1px', transitionDelay: '.38s',
                background: 'linear-gradient(to right, transparent, rgba(196,160,90,.45), transparent)',
              }}
            />
          </div>

          {/* Form en bas — style bottom-sheet (arrondis en haut) */}
          <div
            className={`reveal ${visible ? 'in' : ''}`}
            style={{ transitionDelay: '.5s', borderRadius: '1rem 1rem 0 0', overflow: 'hidden' }}
          >
            <CandidatureForm />
          </div>
        </div>

        {/* ── DESKTOP GRID 48/52 ── */}
        <div
          className="hidden md:grid"
          style={{ gridTemplateColumns: '48% 52%', minHeight: '100dvh' }}
        >
          {/* ── PANNEAU GAUCHE — texte + formulaire ── */}
          <div
            className="hero-left flex flex-col justify-center relative overflow-hidden bg-paper"
            style={{ padding: '8rem 3.5rem 4rem 5rem', borderRight: '1px solid var(--border)' }}
          >
            {/* Ligne rouge — grandit de 0 → 3rem */}
            <div className={`red-rule mb-8 ${visible ? 'in' : ''}`} />

            {/* Eyebrow */}
            <div
              className={`reveal font-medium uppercase text-red mb-7 ${visible ? 'in' : ''}`}
              style={{ fontSize: '.58rem', letterSpacing: '.35em', transitionDelay: '.3s' }}
            >
              Casting Montréal · Ouvert 2026
            </div>

            {/* Titre — clip-path reveal staggeré ligne par ligne
                Chaque ligne est dans un wrapper overflow:hidden (clip-reveal).
                Le span part de translateY(105%) → 0. Délais 0.30s / 0.46s. */}
            <div className="mb-10" style={{ fontSize: 'clamp(3rem, 5.5vw, 5.8rem)' }}>
              <div className="clip-reveal">
                <span
                  className={`clip-inner delay-1 font-display font-light text-ink ${visible ? 'in' : ''}`}
                  style={{ letterSpacing: '-.02em' }}
                >
                  Votre <em className="text-red italic font-light">lumière.</em>
                </span>
              </div>
              <div className="clip-reveal">
                <span
                  className={`clip-inner delay-2 font-display font-light text-ink ${visible ? 'in' : ''}`}
                  style={{ letterSpacing: '-.02em' }}
                >
                  Notre <em className="text-red italic font-light">regard.</em>
                </span>
              </div>
            </div>

            {/* Sous-titre */}
            <p
              className={`reveal font-light leading-[1.9] text-muted mb-12 ${visible ? 'in' : ''}`}
              style={{ fontSize: '.82rem', maxWidth: '320px', transitionDelay: '.9s' }}
            >
              Agence de casting photographique à Montréal. Shootings éditoriaux,
              commerciaux, campagnes de mode. Tous profils. Réponse garantie.
            </p>

            {/* Formulaire multi-étapes */}
            <div className={`reveal ${visible ? 'in' : ''}`} style={{ transitionDelay: '1.1s' }}>
              <CandidatureForm />
            </div>
          </div>

          {/* ── PANNEAU DROIT — photo Ken Burns ── */}
          <PhotoSlideshow />
        </div>

      </section>
    </>
  )
}
