// src/components/admin/AvailabilityBadge.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TIER_CONFIG, type Tier } from '@/components/admin/tierConfig'

export interface AvailableModel {
  id:            string
  prenom:        string
  nom:           string
  genre:         string | null
  taille:        number | null
  tier:          string | null
  disponibilite: string | null
}

interface Props {
  date:            string
  excludeIds:      Set<string>
  onAdd:           (m: AvailableModel) => void
  onModelsLoaded?: (models: AvailableModel[]) => void
}

export function AvailabilityBadge({ date, excludeIds, onAdd, onModelsLoaded }: Props) {
  const [models,  setModels]  = useState<AvailableModel[]>([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const onModelsLoadedRef     = useRef(onModelsLoaded)
  onModelsLoadedRef.current   = onModelsLoaded

  useEffect(() => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setModels([])
      onModelsLoadedRef.current?.([])
      return
    }
    setLoading(true)
    fetch(`/api/candidatures/available?date=${date}`)
      .then(r => r.json())
      .then(d => {
        const list: AvailableModel[] = d.success ? d.data : []
        setModels(list)
        onModelsLoadedRef.current?.(list)
      })
      .finally(() => setLoading(false))
  }, [date])

  const visible = models.filter(m => !excludeIds.has(m.id))

  if (!date || (!loading && visible.length === 0)) return null

  return (
    <div style={{ position: 'relative', marginTop: '.6rem' }}>
      {/* Badge typographique — signature Lumina */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300,
          fontSize: '1.1rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {loading ? '…' : visible.length}
        </span>
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
          fontSize: '.42rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)',
        }}>
          {visible.length === 1 ? 'disponible ce jour' : 'disponibles ce jour'}
        </span>
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontSize: '.42rem', color: 'var(--muted)', fontWeight: 300,
          display: 'inline-block', transition: 'transform .2s cubic-bezier(0.2,0,0,1)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ↓
        </span>
      </button>

      {/* Dropdown avec stagger */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
            style={{
              position: 'absolute', top: 'calc(100% + .4rem)', left: 0, right: 0, zIndex: 20,
              background: 'var(--paper)', borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.08)',
              overflow: 'hidden', maxHeight: '280px', overflowY: 'auto',
            }}
          >
            {visible.map((model, i) => (
              <ModelRow key={model.id} model={model} index={i} onAdd={onAdd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ModelRow({
  model, index, onAdd,
}: { model: AvailableModel; index: number; onAdd: (m: AvailableModel) => void }) {
  const tierCfg = model.tier ? TIER_CONFIG[model.tier as Tier] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0, delay: index * 0.04 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '.5rem',
        padding: '.45rem .65rem',
        borderBottom: '1px solid rgba(26,20,16,.06)',
      }}
    >
      {/* Nom + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 300,
          fontSize: '.55rem', color: 'var(--ink)',
        }}>
          {model.prenom} {model.nom}
        </span>
        {(model.genre || model.taille) && (
          <span style={{
            fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
            fontSize: '.44rem', color: 'var(--muted)', marginLeft: '.35rem',
          }}>
            {[model.genre, model.taille ? `${model.taille} cm` : null].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/* Tier chip */}
      {tierCfg && (
        <span style={{
          fontFamily: "'Montserrat', sans-serif", fontSize: '.38rem', fontWeight: 500,
          letterSpacing: '.1em', textTransform: 'uppercase',
          color: tierCfg.color, border: `1px solid ${tierCfg.border}`,
          borderRadius: '999px', padding: '1px 6px', flexShrink: 0,
        }}>
          {tierCfg.label}
        </span>
      )}

      {/* Bouton + — hit area 40×40px, scale on press */}
      <button
        type="button"
        onClick={() => onAdd(model)}
        aria-label={`Ajouter ${model.prenom} à la session`}
        style={{
          width: 40, height: 40, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: '1px solid rgba(26,20,16,.15)',
          borderRadius: '8px', cursor: 'pointer',
          fontSize: '.75rem', color: 'var(--ink)',
          transitionProperty: 'transform, background', transitionDuration: '.15s',
        }}
        onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
        onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
        onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
      >
        +
      </button>
    </motion.div>
  )
}
