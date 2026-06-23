// useSelection — gère les IDs sélectionnés dans la grille du dashboard.
// Isolé du reste pour pouvoir évoluer (ex: persistance, multi-page) sans toucher le dashboard.
import { useState, useCallback } from 'react'
import type { Candidature } from '@/types/candidature'

export function useSelection(filtered: Candidature[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selectedCount       = selectedIds.size
  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  // Breakdown genre pour la barre flottante (ex: "2F · 1H")
  const selectedBreakdown = (() => {
    const counts: Record<string, number> = {}
    filtered.filter(c => selectedIds.has(c.id)).forEach(c => {
      const k = c.genre === 'Femme' ? 'F' : c.genre === 'Homme' ? 'H' : c.genre ? 'NB' : '?'
      counts[k] = (counts[k] ?? 0) + 1
    })
    return Object.entries(counts).map(([k, n]) => `${n}${k}`).join(' · ')
  })()

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(c => next.delete(c.id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(c => next.add(c.id)); return next })
    }
  }, [allFilteredSelected, filtered])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  return { selectedIds, selectedCount, allFilteredSelected, selectedBreakdown, toggleSelect, toggleSelectAll, clearSelection }
}
