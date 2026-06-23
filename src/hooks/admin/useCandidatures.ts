// useCandidatures — toute la logique API du dashboard : fetch, CRUD, notifications, session.
// Centralise les appels réseau pour que les composants restent purement présentationnels.
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Candidature, SessionForm } from '@/types/candidature'
import { isCandidatureArray } from '@/types/candidature'

export function useCandidatures() {
  const router = useRouter()
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [loading,      setLoading]      = useState(true)

  const fetchCandidatures = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/candidatures')
    const data = await res.json()
    if (!data.success) {
      if (res.status === 401) router.replace('/admin/login')
      setLoading(false)
      return
    }
    if (!isCandidatureArray(data.data)) {
      console.error('[useCandidatures] fetchCandidatures: réponse inattendue', data.data)
      setLoading(false)
      return
    }
    setCandidatures(data.data)
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchCandidatures()
  }, [fetchCandidatures])

  /* Refresh token silencieux toutes les 50 min */
  useEffect(() => {
    const refresh = async () => {
      const res  = await fetch('/api/refresh', { method: 'POST' })
      const data = await res.json()
      if (!data.success) router.replace('/admin/login')
    }
    const id = setInterval(refresh, 50 * 60 * 1000)
    return () => clearInterval(id)
  }, [router])

  /* Déconnexion automatique après 30 min d'inactivité */
  const lastActivityRef = useRef(Date.now())
  useEffect(() => {
    const reset = () => { lastActivityRef.current = Date.now() }
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))

    const check = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 30 * 60 * 1000) {
        fetch('/api/logout', { method: 'POST' }).finally(() => router.replace('/admin/login'))
      }
    }, 60 * 1000)

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearInterval(check)
    }
  }, [router])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  async function handleNotify(selectedIds: Set<string>, onDone: (sent: number) => void) {
    const models = candidatures.filter(c => selectedIds.has(c.id))
    const results = await Promise.allSettled(
      models.map(c => fetch('/api/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: c.email, prenom: c.prenom, nom: c.nom }),
      }))
    )
    // On ne marque comme notifié que les modèles dont la requête a réussi (status 2xx).
    const successIndices = new Set(
      results
        .map((r, i) => (r.status === 'fulfilled' && r.value.ok ? i : -1))
        .filter(i => i >= 0)
    )
    const sent        = successIndices.size
    const notifiedIds = new Set(models.filter((_, i) => successIndices.has(i)).map(c => c.id))
    setCandidatures(prev => prev.map(c => notifiedIds.has(c.id) ? { ...c, selectionne: true } : c))
    onDone(sent)
  }

  async function handleToggleSelectionne(
    c: Candidature,
    setDetail: (fn: (prev: Candidature | null) => Candidature | null) => void,
    showToast: (msg: string) => void,
  ) {
    const newVal = !c.selectionne
    const res    = await fetch(`/api/candidatures/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectionne: newVal }),
    })
    if (!res.ok) { showToast('Erreur lors de la mise à jour.'); return }
    setCandidatures(prev => prev.map(x => x.id === c.id ? { ...x, selectionne: newVal } : x))
    setDetail(prev => prev?.id === c.id ? { ...prev, selectionne: newVal } : prev)
    showToast(newVal ? 'Marqué comme notifié.' : 'Notification annulée.')
  }

  async function handleDelete(id: string, onDone: () => void, showToast: (msg: string) => void) {
    const res = await fetch(`/api/candidatures/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Erreur lors de la suppression.'); return }
    setCandidatures(prev => prev.filter(c => c.id !== id))
    onDone()
    showToast('Candidature supprimée.')
  }

  async function handleSendSession(
    selectedIds: Set<string>,
    session: SessionForm,
    onDone: (sent: number, failed: number, sessionId?: string) => void,
  ) {
    const models = candidatures
      .filter(c => selectedIds.has(c.id))
      // Inclure la langue pour adapter le call time en email bilingue si besoin
      .map(c => ({ email: c.email, prenom: c.prenom, langue: c.langues?.includes('English') ? 'en' : 'fr' }))

    // Set<string> n'est pas JSON-sérialisable — convertir chaque assignedIds en tableau avant fetch
    const res = await fetch('/api/send-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        models,
        session: {
          ...session,
          groups: session.groups.map(g => ({
            ...g,
            assignedIds: [...g.assignedIds]
              .map(id => candidatures.find(c => c.id === id)?.email)
              .filter((e): e is string => Boolean(e)),
          })),
        },
      }),
    })
    if (!res.ok) { onDone(0, models.length); return }
    const data      = await res.json()
    const sent      = typeof data.sent      === 'number' ? data.sent      : 0
    const failed    = typeof data.failed    === 'number' ? data.failed    : 0
    // sessionId transmis au dashboard pour ouvrir automatiquement le panel de suivi
    const sessionId = typeof data.sessionId === 'string'  ? data.sessionId : undefined
    onDone(sent, failed, sessionId)
  }

  return {
    candidatures,
    setCandidatures,
    loading,
    fetchCandidatures,
    logout,
    handleNotify,
    handleToggleSelectionne,
    handleDelete,
    handleSendSession,
  }
}
