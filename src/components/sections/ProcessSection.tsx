'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    n: '01',
    title: 'Soumission',
    desc: 'Remplissez le formulaire en 5 minutes. Deux photos, vos informations, vos mensurations. Aucun CV, aucun historique requis.',
  },
  {
    n: '02',
    title: 'Évaluation',
    desc: 'Notre directrice artistique examine chaque profil personnellement. Réponse garantie sous cinq jours ouvrables par email.',
  },
  {
    n: '03',
    title: 'Shooting test',
    desc: 'Si retenu(e), vous êtes convoqué(e) pour un shooting test rémunéré — premier pas dans notre réseau créatif international.',
  },
]

/* Variantes Framer Motion — stagger parent → enfants animés séquentiellement */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}
const EASE = [0.16, 1, 0.3, 1] as const

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
}

export default function ProcessSection() {
  return (
    <section
      id="process"
      style={{ maxWidth: '1300px', margin: '0 auto', padding: '9rem 3.5rem' }}
    >
      {/* Header — eyebrow + titre + description */}
      <div
        className="proc-header"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          marginBottom: '5rem',
          alignItems: 'end',
        }}
      >
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-medium uppercase"
            style={{ fontSize: '.55rem', letterSpacing: '.35em', color: 'var(--red)', marginBottom: '1.2rem' }}
          >
            Comment ça fonctionne
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-light"
            style={{ fontSize: 'clamp(2.4rem, 4vw, 4rem)', letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            Un processus<br />
            <em style={{ color: 'var(--red)' }}>transparent</em>
          </motion.h2>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-light leading-[1.9]"
          style={{ fontSize: '.85rem', color: 'var(--muted)', maxWidth: '420px', alignSelf: 'end' }}
        >
          De la soumission à la convocation, chaque étape est conçue pour être simple, rapide et respectueuse. Nous répondons à chaque candidature sans exception.
        </motion.p>
      </div>

      {/* 3 colonnes étapes */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem' }}
      >
        {STEPS.map((step) => (
          <motion.div
            key={step.n}
            variants={fadeUp}
            className="proc-col group"
            style={{ paddingTop: '1.8rem', position: 'relative' }}
          >
            {/* Ligne rouge en haut — grandit au hover via CSS */}
            <div
              className="proc-rule"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '1.5px',
                width: '100%',
                background: 'var(--ivory)',
              }}
            >
              <div className="proc-rule-fill" />
            </div>

            <div
              className="font-medium"
              style={{ fontSize: '.52rem', letterSpacing: '.2em', color: 'var(--red)', marginBottom: '.8rem' }}
            >
              {step.n}
            </div>

            <div
              className="font-display font-light"
              style={{ fontSize: '1.6rem', letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: '1rem' }}
            >
              {step.title}
            </div>

            <p
              className="font-light leading-[1.85]"
              style={{ fontSize: '.82rem', color: 'var(--muted)' }}
            >
              {step.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
