'use client'

import { useEffect, useRef, useState } from 'react'

/* Déclenche l'animation seulement après que start=true.
   Utilise requestAnimationFrame pour un rendu 60fps fluide.
   Easing cubic-out : accélération rapide puis décélération — naturel. */
export function useCountUp(target: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number>(0)

  useEffect(() => {
    if (!start) return
    startRef.current = null
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic-out
      setValue(Math.floor(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, start])

  return value
}
