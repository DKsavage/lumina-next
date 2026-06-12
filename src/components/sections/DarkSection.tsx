'use client'

import { motion } from 'framer-motion'

const CRITERIA = [
  'Tous les types de corps bienvenus — nous célébrons la diversité sans réserve.',
  'Aucune expérience requise — nous accompagnons les débutant(e)s avec soin.',
  'Shooting test rémunéré pour chaque profil retenu.',
  'Accès à notre réseau : photographes, stylistes, directeurs artistiques.',
  'Projets éditoriaux, commerciaux et campagnes de mode internationales.',
]

const EASE = [0.16, 1, 0.3, 1] as const

/* Variantes stagger pour la liste de critères */
const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
}

export default function DarkSection() {
  return (
    /* Fond sombre avec grain texture (réutilise le grain SVG de globals.css)
       Le grain est fixe (fixed) donc il s'applique sur cette section aussi — cohérence visuelle. */
    <section
      id="why"
      style={{
        background: 'var(--ink)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Monogramme géant en fond — miroir de hero-left::before */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          fontFamily: 'var(--display)',
          fontSize: '65vw',
          fontWeight: 600,
          fontStyle: 'italic',
          color: 'rgba(247,243,238,0.02)',
          lineHeight: 1,
          right: '-10%',
          bottom: '-20%',
          pointerEvents: 'none',
          letterSpacing: '-0.05em',
          userSelect: 'none',
        }}
      >
        L
      </div>

      <div
        style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '9rem 3.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Colonne gauche — texte + CTA */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-medium uppercase"
            style={{ fontSize: '.55rem', letterSpacing: '.35em', color: 'var(--champagne)', marginBottom: '1.4rem' }}
          >
            Pourquoi nous rejoindre
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-light"
            style={{
              fontSize: 'clamp(2.4rem, 4vw, 4rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--white)',
              marginBottom: '2rem',
            }}
          >
            Ce que nous<br />
            <em style={{ color: 'var(--red-lt)' }}>vous offrons</em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-light leading-[1.9]"
            style={{ fontSize: '.85rem', color: 'rgba(247,243,238,.5)', marginBottom: '2.8rem', maxWidth: '380px' }}
          >
            Lumina Photography est plus qu'une agence — c'est un collectif de créateurs. Depuis 2018, nous collaborons avec des marques exigeantes et des photographes reconnus à l'international.
          </motion.p>

          <motion.a
            href="#apply"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="db-cta inline-flex items-center justify-between font-medium uppercase"
            style={{
              fontSize: '.62rem',
              letterSpacing: '.32em',
              color: 'var(--white)',
              background: 'var(--red)',
              padding: '.9rem 1.4rem',
              textDecoration: 'none',
              position: 'relative',
              overflow: 'hidden',
              gap: '1rem',
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>Candidater maintenant</span>
            <svg
              style={{ position: 'relative', zIndex: 1, width: '.9rem', height: '.9rem' }}
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </motion.a>
        </div>

        {/* Colonne droite — liste numérotée */}
        <motion.div
          variants={list}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
        >
          {CRITERIA.map((text, i) => (
            <motion.div
              key={i}
              variants={item}
              style={{
                display: 'flex',
                gap: '1.5rem',
                padding: '1.4rem 0',
                borderBottom: '1px solid rgba(247,243,238,.06)',
                alignItems: 'flex-start',
              }}
            >
              <span
                className="font-medium"
                style={{ fontSize: '.52rem', letterSpacing: '.15em', color: 'var(--red-lt)', flexShrink: 0, paddingTop: '.1rem' }}
              >
                0{i + 1}
              </span>
              <p
                className="font-light leading-[1.75]"
                style={{ fontSize: '.82rem', color: 'rgba(247,243,238,.65)' }}
              >
                {text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
