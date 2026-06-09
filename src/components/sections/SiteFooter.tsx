'use client'

import { motion } from 'framer-motion'

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '3rem 3.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--paper)',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="font-display italic font-semibold"
        style={{ fontSize: '1.1rem', letterSpacing: '-0.01em', color: 'var(--ink)' }}
      >
        Lumina<em style={{ color: 'var(--red)', fontStyle: 'normal' }}>.</em>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center"
        style={{ gap: '2.5rem' }}
      >
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noreferrer"
          className="nav-link font-medium uppercase text-muted"
          style={{ fontSize: '.55rem', letterSpacing: '.25em' }}
        >
          Instagram
        </a>
        <a
          href="mailto:casting@luminamodels.ca"
          className="nav-link font-medium uppercase text-muted"
          style={{ fontSize: '.55rem', letterSpacing: '.25em' }}
        >
          Contact
        </a>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="font-light"
        style={{ fontSize: '.52rem', color: 'rgba(12,11,9,.2)', letterSpacing: '.1em' }}
      >
        © 2026 Lumina Photography · Montréal
      </motion.p>
    </footer>
  )
}
