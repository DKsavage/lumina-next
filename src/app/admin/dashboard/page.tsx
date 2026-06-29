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
import { AdminNav }         from '@/components/admin/AdminNav'
import { KpiStrip }         from '@/components/admin/KpiStrip'
import { SkeletonCard }     from '@/components/admin/SkeletonCard'
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
  const { candidatures, setCandidatures, duplicateEmails, loading, loadingMore, hasMore, showArchived, archivedCount, fetchCandidatures, toggleShowArchived, loadMore, logout, handleNotify, handleToggleSelectionne, handleArchive, handleEdit, handleTierChange, handleDelete, handleSendSession } = useCandidatures()

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
  const [filterTier,          setFilterTier]          = useState<string | null>(null)
  const [filterTag,           setFilterTag]           = useState<string | null>(null)
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
      const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
      const q = norm(deferredSearch)
      if (q && ![c.prenom, c.nom, c.email, c.ville ?? '', c.telephone, c.instagram ?? '']
        .some(v => norm(v).includes(q))) return false
      if (filterGenre         && c.genre          !== filterGenre)         return false
      if (filterSelectionne   && !c.selectionne)                           return false
      if (tailleMin           && (c.taille ?? 0) < Number(tailleMin))      return false
      if (tailleMax           && (c.taille ?? 999) > Number(tailleMax))    return false
      if (filterInstagram     && !c.instagram)                             return false
      if (filterVille         && !norm(c.ville ?? '').includes(norm(filterVille))) return false
      if (filterDisponibilite && c.disponibilite  !== filterDisponibilite) return false
      if (filterExperience    && c.experience     !== filterExperience)    return false
      if (filterTier          && c.tier           !== filterTier)          return false
      if (filterTag           && !(c.tags ?? []).includes(filterTag))      return false
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
         filterInstagram, filterVille, filterDisponibilite, filterExperience, filterTier, filterTag, sortBy, sortAsc])

  const allTags = useMemo(() =>
    [...new Set(candidatures.flatMap(c => c.tags ?? []))].sort()
  , [candidatures])

  const { selectedIds, selectedCount, allFilteredSelected, selectedBreakdown, toggleSelect, toggleSelectAll, clearSelection, selectByIds } = useSelection(filtered)
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
    // sep=, : directive Excel pour forcer la virgule comme séparateur même en locale française
    // Remplacer \n dans les valeurs pour éviter que les champs multi-lignes cassent les lignes
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
    const csv  = 'sep=,\r\n' + [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n')
    const blob = new Blob([new TextEncoder().encode('﻿' + csv)], { type: 'text/csv;charset=utf-8;' })
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

  const hasActiveFilters = !!(filterGenre || filterSelectionne || tailleMin || tailleMax || filterInstagram || filterVille || filterDisponibilite || filterExperience || filterTier || filterTag)

  const filterChipStyle: React.CSSProperties = { height: 22, borderRadius: '100px', padding: '0 .6rem', fontSize: '.44rem', fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase' as const, background: 'rgba(139,0,32,.07)', color: 'var(--red)', border: '1px solid rgba(139,0,32,.16)', cursor: 'pointer' }

  return (
    <div className="min-h-dvh bg-paper" style={{ fontFamily: "'Montserrat', sans-serif", cursor: 'default' }}>

      {/* NAV */}
      <AdminNav
        newCount={candidatures.filter(c => {
          const days = (Date.now() - new Date(c.date_inscription).getTime()) / 86400000
          return days < 7
        }).length}
        onRefresh={() => fetchCandidatures(showArchived)}
        onExportCSV={handleExportCSV}
        onLogout={logout}
        onNewSession={() => setComposerOpen(true)}
        loading={loading}
      />

      {/* KPI STRIP */}
      <div style={{ padding: '.65rem .8rem 0' }}>
        <KpiStrip items={[
          { label: 'Nouvelles',      value: candidatures.filter(c => (Date.now() - new Date(c.date_inscription).getTime()) / 86400000 < 7).length, accent: true, trend: undefined },
          { label: 'Modèles actifs', value: candidatures.length },
          { label: 'Sessions',       value: 0 },
          { label: 'Sélectionnés',   value: candidatures.filter(c => c.selectionne).length },
        ]} />
      </div>

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
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setFilterGenre(null); setFilterSelectionne(false); setTailleMin(''); setTailleMax('')
          setFilterInstagram(false); setFilterVille(''); setFilterDisponibilite(null); setFilterExperience(null); setFilterTier(null); setFilterTag(null)
        }}
        showArchived={showArchived}           onToggleArchived={toggleShowArchived}
        archivedCount={archivedCount}
        filterInstagram={filterInstagram}         onFilterInstagram={setFilterInstagram}
        filterVille={filterVille}                 onFilterVille={setFilterVille}
        filterDisponibilite={filterDisponibilite} onFilterDisponibilite={setFilterDisponibilite}
        filterExperience={filterExperience}       onFilterExperience={setFilterExperience}
        filterTier={filterTier}                   onFilterTier={setFilterTier}
        filterTag={filterTag}                     onFilterTag={setFilterTag}
        allTags={allTags}
        viewMode={viewMode}                       onSetViewMode={setViewMode}
      />

      {/* GRILLE */}
      {loading ? (
        <div style={{ padding: '.65rem .8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
          {/* Illustration fantôme */}
          <div style={{ width: 64, height: 64, borderRadius: '1rem', background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 8 }}>
            {[1,.7,.45,.25].map((op,i) => <div key={i} style={{ background: 'rgba(26,20,16,.12)', borderRadius: 3, opacity: op }} />)}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.2rem', color: 'var(--ink)' }}>
            Aucun modèle trouvé
          </div>
          {/* Filtres actifs avec croix */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {filterGenre && <button type="button" onClick={() => setFilterGenre(null)} style={filterChipStyle}>{filterGenre} ✕</button>}
              {filterSelectionne && <button type="button" onClick={() => setFilterSelectionne(false)} style={filterChipStyle}>Sélectionnés ✕</button>}
              {filterTier && <button type="button" onClick={() => setFilterTier(null)} style={filterChipStyle}>{filterTier} ✕</button>}
              {filterVille && <button type="button" onClick={() => setFilterVille('')} style={filterChipStyle}>{filterVille} ✕</button>}
              {filterDisponibilite && <button type="button" onClick={() => setFilterDisponibilite(null)} style={filterChipStyle}>{filterDisponibilite} ✕</button>}
              {filterExperience && <button type="button" onClick={() => setFilterExperience(null)} style={filterChipStyle}>{filterExperience} ✕</button>}
              {(tailleMin || tailleMax) && <button type="button" onClick={() => { setTailleMin(''); setTailleMax('') }} style={filterChipStyle}>{tailleMin||'?'}–{tailleMax||'?'} cm ✕</button>}
            </div>
          )}
          <div style={{ fontSize: '.52rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
            {search ? `Aucun modèle ne correspond à "${search}"` : 'Essaie d\'élargir les critères ou réinitialise les filtres'}
          </div>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterGenre(null); setFilterSelectionne(false); setTailleMin(''); setTailleMax(''); setFilterInstagram(false); setFilterVille(''); setFilterDisponibilite(null); setFilterExperience(null); setFilterTier(null); setFilterTag(null) }}
            style={{ height: 32, borderRadius: '100px', padding: '0 1rem', background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.44rem', letterSpacing: '.14em', fontWeight: 500, textTransform: 'uppercase', boxShadow: '0 1px 5px rgba(139,0,32,.28)' }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '.6rem', padding: '.65rem .8rem 6rem' }}>
          {/* Zone grille — rétrécit quand panel ouvert */}
          <div style={{
            flex: detail ? '0 0 auto' : 1,
            maxWidth: detail ? 'calc(2 * 200px + .5rem)' : undefined,
            transition: 'max-width .4s var(--spring), flex .4s var(--spring)',
            minWidth: 0,
          }}>
            {viewMode === 'list' ? (
              <CandidatureList
                candidatures={filtered}
                selectedIds={selectedIds}
                duplicateEmails={duplicateEmails}
                onToggle={toggleSelect}
                onViewDetail={setDetail}
                onTierChange={handleTierChange}
              />
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: detail
                  ? 'repeat(2, minmax(0, 200px))'
                  : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}>
                {filtered.map((c) => (
                  <CandidatureCard
                    key={c.id}
                    c={c}
                    selected={selectedIds.has(c.id)}
                    isDuplicate={duplicateEmails.has(c.email)}
                    onToggle={toggleSelect}
                    onViewDetail={setDetail}
                    onTierChange={handleTierChange}
                    style={!detail && c.tier === 'ambassadeur' ? { gridRow: 'span 2' } : undefined}
                  />
                ))}
              </div>
            )}
            {/* Load more */}
            {hasMore && !detail && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <button onClick={loadMore} disabled={loadingMore} style={{ fontSize: '.5rem', letterSpacing: '.3em', fontWeight: 500, textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', padding: '.7rem 2rem', cursor: loadingMore ? 'not-allowed' : 'pointer', color: 'var(--muted)', opacity: loadingMore ? .5 : 1 }}>
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </button>
              </div>
            )}
          </div>

          {/* Panel détail — inline dans la grille, push gauche vers 2 cols */}
          <AnimatePresence>
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
                onToggleSelectionne={(id) => {
                  const c = candidatures.find(x => x.id === id)
                  if (c) handleToggleSelectionne(c, setDetail, showToast)
                }}
                onComposeSession={() => setComposerOpen(true)}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* BARRE FLOTTANTE */}
      <FloatingBar
        selectedCount={selectedCount}
        selectedBreakdown={selectedBreakdown}
        selectedItems={filtered.filter(c => selectedIds.has(c.id))}
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
          onImportFromSession={(emails) => {
            const emailSet = new Set(emails)
            const ids = candidatures.filter(c => emailSet.has(c.email)).map(c => c.id)
            selectByIds(ids)
          }}
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

      {/* LIGHTBOX */}
      <AnimatePresence initial={false}>
        {lightbox && <Lightbox key="lightbox" src={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      {/* TOAST */}
      <Toast message={toast} />
    </div>
  )
}
