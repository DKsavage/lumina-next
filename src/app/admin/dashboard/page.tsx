'use client'

// dashboard/page.tsx — orchestrateur du dashboard admin.
// Ne contient aucune logique métier : assemble les hooks et composants.
// Logique API       → hooks/admin/useCandidatures.ts
// Logique sélection → hooks/admin/useSelection.ts
// Composants        → components/admin/

import { useEffect, useState, useMemo, useDeferredValue } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useCandidatures }  from '@/hooks/admin/useCandidatures'
import { useSelection }     from '@/hooks/admin/useSelection'
import { CandidatureCard }  from '@/components/admin/CandidatureCard'
import { CandidatureList }  from '@/components/admin/CandidatureList'
import { DetailPanel }      from '@/components/admin/DetailPanel'
import { FloatingBar }      from '@/components/admin/FloatingBar'
import { SessionComposer }     from '@/components/admin/SessionComposer'
import { SessionStatusPanel }  from '@/components/admin/SessionStatusPanel'
import { Lightbox }            from '@/components/admin/Lightbox'
import { Toast }            from '@/components/admin/Toast'
import { DashboardFilters } from '@/components/admin/DashboardFilters'
import type { Candidature, SessionForm, SortKey } from '@/types/candidature'

export default function DashboardPage() {
  const { candidatures, setCandidatures, duplicateEmails, loading, loadingMore, hasMore, showArchived, archivedCount, fetchCandidatures, toggleShowArchived, loadMore, logout, handleNotify, handleToggleSelectionne, handleArchive, handleEdit, handleDelete, handleSendSession } = useCandidatures()

  const [search,            setSearch]            = useState('')
  // useDeferredValue : le filtre s'exécute après que le champ de saisie se soit mis à jour,
  // évitant de bloquer le thread principal à chaque frappe sur de grandes listes
  const deferredSearch = useDeferredValue(search)
  const [filterGenre,       setFilterGenre]       = useState<string | null>(null)
  const [filterSelectionne, setFilterSelectionne] = useState(false)
  const [sortBy,            setSortBy]            = useState<SortKey>('date')
  const [sortAsc,           setSortAsc]           = useState(false)
  const [tailleMin,         setTailleMin]         = useState('')
  const [tailleMax,         setTailleMax]         = useState('')
  const [filterInstagram,     setFilterInstagram]     = useState(false)
  const [filterVille,         setFilterVille]         = useState('')
  const [filterDisponibilite, setFilterDisponibilite] = useState<string | null>(null)
  const [filterExperience,    setFilterExperience]    = useState<string | null>(null)
  const [composerOpen,      setComposerOpen]      = useState(false)
  const [sending,           setSending]           = useState(false)
  const [toast,             setToast]             = useState('')
  const [notifying,         setNotifying]         = useState(false)
  const [confirmNotify,     setConfirmNotify]     = useState(false)
  const [detail,            setDetail]            = useState<Candidature | null>(null)
  const [confirmDelete,     setConfirmDelete]     = useState(false)
  const [lightbox,          setLightbox]          = useState<string | null>(null)
  // sessionStatusId — ID de la session dont on veut afficher le suivi de confirmation
  const [sessionStatusId,   setSessionStatusId]   = useState<string | null>(null)
  const [viewMode,          setViewMode]          = useState<'grid' | 'list'>('grid')

  useEffect(() => { setConfirmDelete(false) }, [detail])

  /* useMemo évite de re-trier toute la liste à chaque frappe */
  const filtered = useMemo(() => candidatures
    .filter(c => {
      const q = deferredSearch.toLowerCase()
      if (q && ![c.prenom, c.nom, c.email, c.ville ?? '', c.telephone, c.instagram ?? '']
        .some(v => v.toLowerCase().includes(q))) return false
      if (filterGenre         && c.genre          !== filterGenre)         return false
      if (filterSelectionne   && !c.selectionne)                           return false
      if (tailleMin           && (c.taille ?? 0) < Number(tailleMin))      return false
      if (tailleMax           && (c.taille ?? 999) > Number(tailleMax))    return false
      if (filterInstagram     && !c.instagram)                             return false
      if (filterVille         && !c.ville?.toLowerCase().includes(filterVille.toLowerCase())) return false
      if (filterDisponibilite && c.disponibilite  !== filterDisponibilite) return false
      if (filterExperience    && c.experience     !== filterExperience)    return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'nom')    cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
      if (sortBy === 'taille') cmp = (a.taille ?? 0) - (b.taille ?? 0)
      if (sortBy === 'date')   cmp = new Date(a.date_inscription).getTime() - new Date(b.date_inscription).getTime()
      if (sortBy === 'age') {
        const ageA = a.date_naissance ? new Date().getFullYear() - new Date(a.date_naissance).getFullYear() : 0
        const ageB = b.date_naissance ? new Date().getFullYear() - new Date(b.date_naissance).getFullYear() : 0
        cmp = ageA - ageB
      }
      return sortAsc ? cmp : -cmp
    }), [candidatures, deferredSearch, filterGenre, filterSelectionne, tailleMin, tailleMax,
         filterInstagram, filterVille, filterDisponibilite, filterExperience, sortBy, sortAsc])

  const { selectedIds, selectedCount, allFilteredSelected, selectedBreakdown, toggleSelect, toggleSelectAll, clearSelection } = useSelection(filtered)
  const detailIdx = detail ? filtered.findIndex(c => c.id === detail.id) : -1

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  async function copyToClipboard(text: string) {
    try { await navigator.clipboard.writeText(text); showToast(`Copié : ${text}`) }
    catch { showToast('Impossible de copier') }
  }

  function handleCopyList() {
    const lines = filtered
      .filter(c => selectedIds.has(c.id))
      .map(c => [
        `${c.prenom} ${c.nom}`,
        c.taille ? `${c.taille} cm` : null,
        c.ville ?? null,
      ].filter(Boolean).join(' — '))
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => showToast(`Liste copiée (${lines.length} modèle${lines.length > 1 ? 's' : ''})`))
      .catch(() => showToast('Impossible de copier'))
  }

  function handleExportCSV() {
    if (filtered.length > 500 && !window.confirm(`Exporter ${filtered.length} candidatures ? Le fichier peut être volumineux.`)) return
    const headers = ['Prénom','Nom','Email','Téléphone','Genre','Taille','Ville','Pays','Expérience','Disponibilité','Langues','Instagram','Date inscription','Notifié']
    const rows = filtered.map(c => [
      c.prenom, c.nom, c.email, c.telephone, c.genre ?? '',
      c.taille ?? '', c.ville ?? '', c.pays ?? '',
      c.experience ?? '', c.disponibilite ?? '', c.langues ?? '',
      c.instagram ?? '',
      new Date(c.date_inscription).toLocaleDateString('fr-CA'),
      c.selectionne ? 'Oui' : 'Non',
    ])
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `lumina-${new Date().toISOString().slice(0,10)}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  /* Navigation clavier dans le panel détail */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        if (detail)   { setDetail(null); return }
      }
      if (!detail || detailIdx < 0) return
      if (e.key === 'ArrowLeft'  && detailIdx > 0)                   setDetail(filtered[detailIdx - 1])
      if (e.key === 'ArrowRight' && detailIdx < filtered.length - 1) setDetail(filtered[detailIdx + 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, detail, detailIdx, filtered])

  return (
    <div className="min-h-dvh bg-paper" style={{ fontFamily: "'Montserrat', sans-serif", cursor: 'default' }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-paper" style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 2rem' }}>
        <div className="flex items-center gap-8">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Lumina<span style={{ color: 'var(--red)' }}>.</span>
          </span>
          <span className="hidden md:block font-medium uppercase text-muted" style={{ fontSize: '.44rem', letterSpacing: '.3em' }}>Dashboard Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <div className="text-ink font-light tabular-nums" style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{candidatures.length}</div>
              <div className="text-muted font-medium uppercase" style={{ fontSize: '.4rem', letterSpacing: '.25em' }}>Modèles</div>
            </div>
            <div style={{ width: '1px', height: '2rem', background: 'var(--border)' }} />
            <div className="text-center">
              <div className="text-red font-light tabular-nums" style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{candidatures.filter(c => c.selectionne).length}</div>
              <div className="text-muted font-medium uppercase" style={{ fontSize: '.4rem', letterSpacing: '.25em' }}>Notifiés</div>
            </div>
          </div>
          <button onClick={() => fetchCandidatures(showArchived)} disabled={loading} className="text-muted transition-colors duration-200 hover:text-ink" style={{ background: 'none', fontSize: '1rem', lineHeight: 1, opacity: loading ? .4 : 1 }} aria-label="Rafraîchir" title="Rafraîchir">↺</button>
          <button onClick={handleExportCSV} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>Export CSV</button>
          <a href="/admin/sessions" className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink" style={{ fontSize: '.44rem', letterSpacing: '.25em' }}>Sessions</a>
          <button onClick={logout} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-red" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>Déconnexion</button>
        </div>
      </nav>

      {/* FILTRES */}
      <DashboardFilters
        search={search}                 onSearch={setSearch}
        filterGenre={filterGenre}       onFilterGenre={setFilterGenre}
        filterSelectionne={filterSelectionne} onFilterSelectionne={setFilterSelectionne}
        tailleMin={tailleMin}           onTailleMin={setTailleMin}
        tailleMax={tailleMax}           onTailleMax={setTailleMax}
        sortBy={sortBy}                 sortAsc={sortAsc}
        onSort={key => { if (sortBy === key) setSortAsc(v => !v); else { setSortBy(key); setSortAsc(key === 'nom') } }}
        allFilteredSelected={allFilteredSelected} onToggleSelectAll={toggleSelectAll}
        filteredCount={filtered.length} totalCount={candidatures.length}
        hasActiveFilters={!!(filterGenre || filterSelectionne || tailleMin || tailleMax || filterInstagram || filterVille || filterDisponibilite || filterExperience)}
        onResetFilters={() => {
          setFilterGenre(null); setFilterSelectionne(false); setTailleMin(''); setTailleMax('')
          setFilterInstagram(false); setFilterVille(''); setFilterDisponibilite(null); setFilterExperience(null)
        }}
        showArchived={showArchived}           onToggleArchived={toggleShowArchived}
        archivedCount={archivedCount}
        filterInstagram={filterInstagram}         onFilterInstagram={setFilterInstagram}
        filterVille={filterVille}                 onFilterVille={setFilterVille}
        filterDisponibilite={filterDisponibilite} onFilterDisponibilite={setFilterDisponibilite}
        filterExperience={filterExperience}       onFilterExperience={setFilterExperience}
        viewMode={viewMode}                       onSetViewMode={setViewMode}
      />

      {/* GRILLE */}
      <div style={{ padding: '2rem 2rem 8rem' }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="font-light text-muted" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem' }}>Chargement…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: 'rgba(139,0,32,.15)', marginBottom: '1rem' }}>Aucun résultat</div>
              <div className="text-muted font-light" style={{ fontSize: '.7rem' }}>
                {search ? `Aucun modèle ne correspond à "${search}"` : 'Aucune candidature enregistrée.'}
              </div>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <CandidatureList
                candidatures={filtered}
                selectedIds={selectedIds}
                duplicateEmails={duplicateEmails}
                onToggle={toggleSelect}
                onViewDetail={setDetail}
              />
            ) : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {filtered.map(c => (
                  <CandidatureCard key={c.id} c={c} selected={selectedIds.has(c.id)} isDuplicate={duplicateEmails.has(c.email)} onToggle={toggleSelect} onViewDetail={setDetail} />
                ))}
              </div>
            )}
            {hasMore && (
              <div className="flex justify-center" style={{ marginTop: '2rem' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink"
                  style={{ fontSize: '.5rem', letterSpacing: '.3em', background: 'none', border: '1px solid var(--border)', padding: '.7rem 2rem', opacity: loadingMore ? .5 : 1, cursor: loadingMore ? 'not-allowed' : 'pointer' }}
                >
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* BARRE FLOTTANTE */}
      <FloatingBar
        selectedCount={selectedCount}
        selectedBreakdown={selectedBreakdown}
        notifying={notifying}
        confirmNotify={confirmNotify}
        onClearSelection={() => { clearSelection(); setConfirmNotify(false) }}
        onRequestNotify={() => setConfirmNotify(true)}
        onConfirmNotify={async () => {
          setNotifying(true)
          await handleNotify(selectedIds, sent => {
            showToast(`Notifications envoyées à ${sent} modèle(s).`)
            clearSelection()
            setConfirmNotify(false)
          })
          setNotifying(false)
        }}
        onCancelNotify={() => setConfirmNotify(false)}
        onComposeSession={() => setComposerOpen(true)}
        onCopyList={handleCopyList}
      />

      {/* COMPOSER SESSION */}
      {composerOpen && (
        <SessionComposer
          selectedCount={selectedCount}
          selectedCandidatures={filtered
            .filter(c => selectedIds.has(c.id))
            .map(c => ({ id: c.id, prenom: c.prenom, nom: c.nom, genre: c.genre ?? null }))}
          onClose={() => setComposerOpen(false)}
          sending={sending}
          onSubmit={async (session: SessionForm) => {
            setSending(true)
            await handleSendSession(selectedIds, session, (sent, failed, sessionId) => {
              showToast(`Session envoyée à ${sent} modèle(s).${failed ? ` (${failed} échec)` : ''}`)
              clearSelection()
              setComposerOpen(false)
              // Ouvrir automatiquement le panel de suivi après envoi réussi
              if (sessionId) setSessionStatusId(sessionId)
            })
            setSending(false)
          }}
        />
      )}

      {/* SUIVI CONFIRMATION SESSION */}
      {sessionStatusId && (
        <SessionStatusPanel
          sessionId={sessionStatusId}
          onClose={() => setSessionStatusId(null)}
        />
      )}

      {/* PANEL DÉTAIL */}
      <AnimatePresence initial={false}>
        {detail && (
          <DetailPanel
            key={detail.id}
            detail={detail}
            detailIdx={detailIdx}
            filteredLength={filtered.length}
            selected={selectedIds.has(detail.id)}
            confirmDelete={confirmDelete}
            onToggleSelect={toggleSelect}
            onPrev={() => detailIdx > 0 && setDetail(filtered[detailIdx - 1])}
            onNext={() => detailIdx < filtered.length - 1 && setDetail(filtered[detailIdx + 1])}
            onClose={() => setDetail(null)}
            onLightbox={setLightbox}
            onToggleNotified={c => handleToggleSelectionne(c, setDetail, showToast)}
            onArchive={id => handleArchive(id, !detail?.archived, () => setDetail(null), showToast)}
            onRequestDelete={() => setConfirmDelete(true)}
            onConfirmDelete={id => handleDelete(id, () => setDetail(null), showToast)}
            onCancelDelete={() => setConfirmDelete(false)}
            onCopyToClipboard={copyToClipboard}
            onEdit={async patch => handleEdit(detail.id, patch, setDetail, showToast)}
          />
        )}
      </AnimatePresence>

      {/* LIGHTBOX */}
      <AnimatePresence initial={false}>
        {lightbox && <Lightbox key="lightbox" src={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      {/* TOAST */}
      <Toast message={toast} />
    </div>
  )
}
