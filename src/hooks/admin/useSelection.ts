// useSelection — gère les IDs sélectionnés dans la grille du dashboard.
// Isolé du reste pour pouvoir évoluer (ex: persistance, multi-page) sans toucher le dashboard.
import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Candidature } from '@/types/candidature'

// Clé stable — une seule sélection partagée sur toutes les pages de l'admin
const LS_KEY = 'lumina_selection'

export function useSelection(filtered: Candidature[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Restaurer depuis localStorage au premier render (SSR-safe : window n'existe pas côté serveur)
    try {
      const stored = localStorage.getItem(LS_KEY)
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  // Synchroniser localStorage à chaque changement de sélection
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...selectedIds]))
    } catch { /* quota dépassé — silencieux */ }
  }, [selectedIds])

  // Nettoyer les IDs fantômes (candidature supprimée/archivée depuis le dernier refresh)
  useEffect(() => {
    const filteredIds = new Set(filtered.map(c => c.id))
    setSelectedIds(prev => {
      const cleaned = new Set([...prev].filter(id => filteredIds.has(id)))
      // Référence stable si rien n'a changé — évite un re-render inutile
      return cleaned.size === prev.size ? prev : cleaned
    })
  }, [filtered])

  const selectedCount       = selectedIds.size
  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  // useMemo : évite de recalculer à chaque render quand filtered et selectedIds n'ont pas changé
  const selectedBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.filter(c => selectedIds.has(c.id)).forEach(c => {
      const k = c.genre === 'Femme' ? 'F' : c.genre === 'Homme' ? 'H' : c.genre ? 'NB' : '?'
      counts[k] = (counts[k] ?? 0) + 1
    })
    return Object.entries(counts).map(([k, n]) => `${n}${k}`).join(' · ')
  }, [filtered, selectedIds])

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

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    // Vider aussi localStorage pour que le refresh repart propre
    try { localStorage.removeItem(LS_KEY) } catch { /* silencieux */ }
  }, [])

  const selectByIds = useCallback((ids: string[]) => {
    setSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next })
  }, [])

  return { selectedIds, selectedCount, allFilteredSelected, selectedBreakdown, toggleSelect, toggleSelectAll, clearSelection, selectByIds }
}
