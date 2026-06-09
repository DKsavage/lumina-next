'use client'

import { useEffect, useState } from 'react'
import PhotoSlideshow from './PhotoSlideshow'
import CandidatureForm from '../form/CandidatureForm'

const SLIDE_COUNT = 5

export default function HeroSplit() {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* ── NAV FIXE ── toujours blanc (fond toujours sombre) ── */}
      <nav
        className="hero-nav fixed top-0 left-0 right-0 z-[500] flex items-center justify-between px-6 md:px-14"
        style={{ paddingTop: '1.8rem', paddingBottom: '1.8rem' }}
      >
        <a href="#" className="flex items-center gap-3 no-underline">
          <div className="logo-mark"><span>L</span></div>
          <span className="logo-word">Lumina<em>.</em></span>
        </a>

        <div className="hidden md:flex items-center" style={{ gap: '2.5rem' }}>
          <a href="#process" className="nav-link font-medium uppercase"
            style={{ fontSize: '.58rem', letterSpacing: '.28em', color: 'rgba(247,243,238,.42)' }}>
            Processus
          </a>
          <a href="#why" className="nav-link font-medium uppercase"
            style={{ fontSize: '.58rem', letterSpacing: '.28em', color: 'rgba(247,243,238,.42)' }}>
            L&rsquo;agence
          </a>
        </div>
      </nav>

      {/* ── Label vertical — toujours clair ── */}
      <span className="vert-label hidden md:block">Lumina Photography · Casting 2026</span>

      {/* ══════════════════════════════════════════════
          SECTION HERO — fond toujours ink (sombre)
          Layout centré desktop + bottom-sheet mobile
      ══════════════════════════════════════════════ */}
      <section
        id="apply"
        className="relative overflow-hidden"
        style={{ minHeight: '100dvh', background: 'var(--ink)' }}
      >
        {/* SLIDESHOW plein écran — z-0 */}
        <div className="absolute inset-0 z-0">
          <PhotoSlideshow
            current={current}
            onAdvance={() => setCurrent(prev => (prev + 1) % SLIDE_COUNT)}
          />
        </div>

        {/* OVERLAY sombre — z-[1], pointer-events-none */}
        <div className="overlay absolute inset-0 z-[1] pointer-events-none" />

        {/* ── CONTENU — z-10 ── */}
        {/*
          Mobile  : flex-col, padding-top (nav), titre flex-1 (remonte), form en bas
          Desktop : flex-col centré verticalement + horizontalement, gap 2.5rem
        */}
        <main
          className="hero-content relative z-10 flex flex-col items-center"
          style={{ minHeight: '100dvh' }}
        >

          {/* ── BLOC TITRE ──
              Mobile  : flex-1 → prend tout l'espace, contenu centré en son sein
              Desktop : flex-0, hauteur naturelle
          ── */}
          <div className="title-block flex flex-col items-center justify-center gap-4 text-center pointer-events-none">
            {/* Eyebrow pill */}
            <div
              className={`reveal ${visible ? 'in' : ''} font-medium uppercase`}
              style={{
                fontSize: '.44rem', letterSpacing: '.35em', transitionDelay: '.1s',
                color: 'rgba(247,243,238,.5)',
                border: '1px solid rgba(247,243,238,.15)',
                borderRadius: '99px', padding: '.38rem 1.1rem', display: 'inline-flex', gap: '.55rem',
              }}
            >
              <span style={{ opacity: .4 }}>———</span>
              Casting ouvert · Montréal 2026
              <span style={{ opacity: .4 }}>———</span>
            </div>

            {/* Titre principal */}
            <h1
              className={`reveal font-display font-light ${visible ? 'in' : ''}`}
              style={{
                fontSize: 'clamp(3.5rem, 13vw, 7rem)', lineHeight: .96,
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

          {/* ── FORM SHELL ──
              Mobile  : form-shell = wrapper full-width, overflow hidden, border-radius top → bottom-sheet
              Desktop : form-shell = double-bezel verre, max-width 490px, centré
          ── */}
          <div
            className={`form-shell reveal w-full ${visible ? 'in' : ''}`}
            style={{ transitionDelay: '.55s' }}
          >
            <CandidatureForm />
          </div>
        </main>

        {/* ── COMPTEUR + DOTS — desktop uniquement, z-[20] (au-dessus overlay) ── */}
        <div className="absolute bottom-10 right-10 z-[20] hidden md:flex flex-col items-end gap-3">
          <span
            className="font-display italic tabular-nums"
            style={{ fontSize: '2.5rem', fontWeight: 300, color: 'rgba(255,255,255,.12)', lineHeight: 1 }}
          >
            {String(current + 1).padStart(2, '0')}
          </span>
          <div className="flex gap-[.35rem] items-center">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
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
      </section>
    </>
  )
}
