'use client'

import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useCountUp } from '@/hooks/useCountUp'

/* Chaque stat est isolé pour que le count-up démarre
   exactement quand la section entre dans le viewport. */
function Stat({
  count,
  suffix = '+',
  label,
  isText = false,
  text = '',
  delay = 0,
}: {
  count?: number
  suffix?: string
  label: string
  isText?: boolean
  text?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const value = useCountUp(count ?? 0, 2000, !isText && inView)

  return (
    <div
      ref={ref}
      className="stat-item flex flex-col justify-center"
      style={{
        padding: '3rem 3.5rem',
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(12px)',
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      <div
        className="font-display italic font-light"
        style={{ fontSize: 'clamp(2.8rem, 4vw, 4.2rem)', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}
      >
        {isText ? (
          <span style={{ color: 'var(--red)' }}>{text}</span>
        ) : (
          <>
            {value}
            <span style={{ color: 'var(--red)', fontSize: '0.55em' }}>{suffix}</span>
          </>
        )}
      </div>
      <div
        className="font-medium uppercase"
        style={{ fontSize: '.52rem', letterSpacing: '.28em', color: 'var(--muted)', marginTop: '.6rem' }}
      >
        {label}
      </div>
    </div>
  )
}

const STATS = [
  { count: 200, suffix: '+', label: 'Modèles actifs' },
  { count: 50,  suffix: '+', label: 'Shootings / an' },
  { count: 8,   suffix: '',  label: 'Années d\'expérience' },
  { count: 18, suffix: '+', label: 'Nationalités' },
]

export default function StatsBar() {
  return (
    <div
      style={{
        borderTop:    '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}
    >
      {STATS.map((s, i) => (
        <div
          key={i}
          style={{
            borderRight: i < 3 ? '1px solid var(--border)' : undefined,
          }}
        >
          <Stat
            count={s.count}
            suffix={s.suffix}
            label={s.label}
            delay={i * 80}
          />
        </div>
      ))}
    </div>
  )
}
