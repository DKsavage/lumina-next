'use client'

/* 'use client' est obligatoire ici car on utilise useEffect et useRef
   qui n'existent que dans le navigateur (pas côté serveur). */
import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mx = 0, my = 0
    let rx = 0, ry = 0
    let rafId: number

    /* Le point suit la souris instantanément */
    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (dotRef.current) {
        dotRef.current.style.left = mx + 'px'
        dotRef.current.style.top  = my + 'px'
      }
    }

    /* L'anneau "rattrape" le point avec un délai (lerp 0.12).
       Plus le coefficient est bas, plus le lag est prononcé.
       requestAnimationFrame → 60fps garanti, pas de setInterval. */
    const animRing = () => {
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      if (ringRef.current) {
        ringRef.current.style.left = rx + 'px'
        ringRef.current.style.top  = ry + 'px'
      }
      rafId = requestAnimationFrame(animRing)
    }

    document.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(animRing)

    /* Cleanup → évite les memory leaks quand le composant se démonte */
    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  id="cur-dot"  aria-hidden="true" />
      <div ref={ringRef} id="cur-ring" aria-hidden="true" />
    </>
  )
}
