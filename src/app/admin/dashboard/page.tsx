'use client'

// dashboard/page.tsx — orchestrateur du dashboard admin.
// Ne contient aucune logique métier : assemble les hooks et composants.
// Logique API       → hooks/admin/useCandidatures.ts
// Logique sélection → hooks/admin/useSelection.ts
// Composants        → components/admin/

import { useEffect, useState, useMemo } from 'react'
import { useCandidatures }  from '@/hooks/admin/useCandidatures'
import { useSelection }     from '@/hooks/admin/useSelection'
import { CandidatureCard }  from '@/components/admin/CandidatureCard'
import { DetailPanel }      from '@/components/admin/DetailPanel'
import { FloatingBar }      from '@/components/admin/FloatingBar'
import { SessionComposer }  from '@/components/admin/SessionComposer'
import { Lightbox }         from '@/components/admin/Lightbox'
import { Toast }            from '@/components/admin/Toast'
import { DashboardFilters } from '@/components/admin/DashboardFilters'
import type { Candidature, SessionForm, SortKey } from '@/types/candidature'

export default function DashboardPage() {
  const { candidatures, setCandidatures, loading, fetchCandidatures, logout, handleNotify, handleToggleSelectionne, handleDelete, handleSendSession } = useCandidatures()

  const [search,            setSearch]            = useState('')
  const [filterGenre,       setFilterGenre]       = useState<string | null>(null)
  const [filterSelectionne, setFilterSelectionne] = useState(false)
  const [sortBy,            setSortBy]            = useState<SortKey>('date')
  const [sortAsc,           setSortAsc]           = useState(false)
  const [tailleMin,         setTailleMin]         = useState('')
  const [tailleMax,         setTailleMax]         = useState('')
  const [composerOpen,      setComposerOpen]      = useState(false)
  const [sending,           setSending]           = useState(false)
  const [toast,             setToast]             = useState('')
  const [notifying,         setNotifying]         = useState(false)
  const [confirmNotify,     setConfirmNotify]     = useState(false)
  const [detail,            setDetail]            = useState<Candidature | null>(null)
  const [confirmDelete,     setConfirmDelete]     = useState(false)
  const [lightbox,          setLightbox]          = useState<string | null>(null)

  useEffect(() => { setConfirmDelete(false) }, [detail])

  /* useMemo évite de re-trier toute la liste à chaque frappe */
  const filtered = useMemo(() => candidatures
    .filter(c => {
      const q = search.toLowerCase()
      if (q && !c.prenom.toLowerCase().includes(q) && !c.nom.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false
      if (filterGenre && c.genre !== filterGenre) return false
      if (filterSelectionne && !c.selectionne) return false
      if (tailleMin && (c.taille ?? 0) < Number(tailleMin)) return false
      if (tailleMax && (c.taille ?? 999) > Number(tailleMax)) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'nom')    cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
      if (sortBy === 'taille') cmp = (a.taille ?? 0) - (b.taille ?? 0)
      if (sortBy === 'date')   cmp = new Date(a.date_inscription).getTime() - new Date(b.date_inscription).getTime()
      return sortAsc ? cmp : -cmp
    }), [candidatures, search, filterGenre, filterSelectionne, tailleMin, tailleMax, sortBy, sortAsc])

  const { selectedIds, selectedCount, allFilteredSelected, selectedBreakdown, toggleSelect, toggleSelectAll, clearSelection } = useSelection(filtered)
  const detailIdx = detail ? filtered.findIndex(c => c.id === detail.id) : -1

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  async function copyToClipboard(text: string) {
    try { await navigator.clipboard.writeText(text); showToast(`Copié : ${text}`) }
    catch { showToast('Impossible de copier') }
  }

  function handleExportCSV() {
    const headers = ['Prénom','Nom','Email','Téléphone','Genre','Taille','Ville','Pays','Expérience','Disponibilité','Langues','Date inscription','Notifié']
    const rows = candidatures.map(c => [
      c.prenom, c.nom, c.email, c.telephone, c.genre ?? '',
      c.taille ?? '', c.ville ?? '', c.pays ?? '',
      c.experience ?? '', c.disponibilite ?? '', c.langues ?? '',
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
          <button onClick={fetchCandidatures} disabled={loading} className="text-muted transition-colors duration-200 hover:text-ink" style={{ background: 'none', fontSize: '1rem', lineHeight: 1, opacity: loading ? .4 : 1 }} aria-label="Rafraîchir" title="Rafraîchir">↺</button>
          <button onClick={handleExportCSV} className="font-medium uppercase text-muted transition-colors duration-200 hover:text-ink" style={{ fontSize: '.44rem', letterSpacing: '.25em', background: 'none' }}>Export CSV</button>
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
        hasActiveFilters={!!(filterGenre || filterSelectionne || tailleMin || tailleMax)}
        onResetFilters={() => { setFilterGenre(null); setFilterSelectionne(false); setTailleMin(''); setTailleMax('') }}
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
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {filtered.map(c => (
              <CandidatureCard key={c.id} c={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} onViewDetail={setDetail} />
            ))}
          </div>
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
      />

      {/* COMPOSER SESSION */}
      {composerOpen && (
        <SessionComposer
          selectedCount={selectedCount}
          onClose={() => setComposerOpen(false)}
          sending={sending}
          onSubmit={async (session: SessionForm) => {
            setSending(true)
            await handleSendSession(selectedIds, session, (sent, failed) => {
              showToast(`Session envoyée à ${sent} modèle(s).${failed ? ` (${failed} échec)` : ''}`)
              clearSelection()
              setComposerOpen(false)
            })
            setSending(false)
          }}
        />
      )}

      {/* PANEL DÉTAIL */}
      {detail && (
        <DetailPanel
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
          onRequestDelete={() => setConfirmDelete(true)}
          onConfirmDelete={id => handleDelete(id, () => setDetail(null), showToast)}
          onCancelDelete={() => setConfirmDelete(false)}
          onCopyToClipboard={copyToClipboard}
        />
      )}

      {/* LIGHTBOX */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* TOAST */}
      <Toast message={toast} />
    </div>
  )
}
