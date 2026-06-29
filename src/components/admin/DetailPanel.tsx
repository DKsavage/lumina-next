// DetailPanel — panneau latéral droit affichant le profil complet d'un candidat.
// Phase 12 : double-bezel slide-in, tabs Infos/Mesures/Sessions, header luxe, actions sticky.
'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { Candidature } from '@/types/candidature'
import { calcAge } from '@/types/candidature'

interface ModelSession {
  id:                 string
  role:               string | null
  status:             'pending' | 'confirmed' | 'cancelled'
  payment_amount:     number | null
  email_delivered_at: string | null
  email_clicked_at:   string | null
  email_bounced_at:   string | null
  session:            { project: string; date: string; type: string } | null
}

const STATUS_META: Record<ModelSession['status'], { label: string; color: string }> = {
  confirmed: { label: 'Confirmé',   color: 'rgba(20,120,60,.9)' },
  cancelled: { label: 'Annulé',     color: 'var(--red)' },
  pending:   { label: 'En attente', color: 'var(--muted)' },
}

interface Props {
  detail:               Candidature
  detailIdx:            number
  filteredLength:       number
  selected:             boolean
  confirmDelete:        boolean
  onToggleSelect:       (id: string) => void
  onPrev:               () => void
  onNext:               () => void
  onClose:              () => void
  onLightbox:           (src: string) => void
  onToggleNotified:     (c: Candidature) => void
  onArchive:            (id: string) => void
  onRequestDelete:      () => void
  onConfirmDelete:      (id: string) => void
  onCancelDelete:       () => void
  onCopyToClipboard:    (text: string) => void
  onEdit:               (patch: Partial<Candidature>) => Promise<boolean>
  onToggleSelectionne?: (id: string) => void
  onComposeSession?:    (items: Candidature[]) => void
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--ivory)' }}>
      <div className="font-medium uppercase" style={{ fontSize: '.42rem', letterSpacing: '.28em', color: 'var(--red)', marginBottom: '.6rem' }}>{label}</div>
      <div className="flex flex-col gap-[.45rem]">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-medium uppercase text-muted flex-shrink-0" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>{label}</span>
      <span className="font-light text-ink text-right" style={{ fontSize: '.72rem' }}>{value}</span>
    </div>
  )
}

export function DetailPanel({
  detail, detailIdx, filteredLength, confirmDelete,
  onPrev, onNext, onClose, onLightbox,
  onToggleNotified, onArchive, onRequestDelete, onConfirmDelete, onCancelDelete, onCopyToClipboard, onEdit,
  onToggleSelectionne, onComposeSession,
}: Props) {
  const [activeTab, setActiveTab] = useState<'Infos'|'Mesures'|'Sessions'>('Infos')

  const [tagsValue, setTagsValue] = useState<string[]>(detail.tags ?? [])
  const [tagInput,  setTagInput]  = useState('')

  async function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag || tagsValue.includes(tag)) { setTagInput(''); return }
    const next = [...tagsValue, tag]
    setTagsValue(next)
    setTagInput('')
    await onEdit({ tags: next })
  }

  async function removeTag(tag: string) {
    const next = tagsValue.filter(t => t !== tag)
    setTagsValue(next)
    await onEdit({ tags: next })
  }

  // Historique des participations — rechargé à chaque modèle (nav prev/next inclus).
  const [history, setHistory] = useState<ModelSession[] | null>(null)
  useEffect(() => {
    setHistory(null)
    let cancelled = false
    fetch(`/api/sessions/by-model?email=${encodeURIComponent(detail.email)}`)
      .then(r => r.ok ? r.json() : { success: false })
      .then(d => { if (!cancelled) setHistory(d.success ? d.data : []) })
      .catch(() => { if (!cancelled) setHistory([]) })
    return () => { cancelled = true }
  }, [detail.email])

  const [notesValue,  setNotesValue]  = useState(detail.notes_admin ?? '')
  const [notesDirty,  setNotesDirty]  = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  async function saveNotes() {
    if (!notesDirty) return
    setNotesSaving(true)
    await onEdit({ notes_admin: notesValue.trim() || null })
    setNotesDirty(false)
    setNotesSaving(false)
  }

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    prenom:        detail.prenom,
    nom:           detail.nom,
    email:         detail.email,
    telephone:     detail.telephone,
    taille:        detail.taille ? String(detail.taille) : '',
    ville:         detail.ville         ?? '',
    pays:          detail.pays          ?? '',
    instagram:     detail.instagram     ?? '',
    experience:    detail.experience    ?? '',
    disponibilite: detail.disponibilite ?? '',
    langues:       detail.langues       ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function saveEdit() {
    setSaving(true)
    const patch: Record<string, string | number | null> = {
      prenom:        editForm.prenom        || null,
      nom:           editForm.nom           || null,
      email:         editForm.email         || null,
      telephone:     editForm.telephone     || null,
      ville:         editForm.ville         || null,
      pays:          editForm.pays          || null,
      instagram:     editForm.instagram     || null,
      experience:    editForm.experience    || null,
      disponibilite: editForm.disponibilite || null,
      langues:       editForm.langues       || null,
    }
    if (editForm.taille) patch.taille = Number(editForm.taille)
    const ok = await onEdit(patch as Partial<Candidature>)
    if (ok) setEditing(false)
    setSaving(false)
  }

  return (
    // Slide-in depuis la droite, largeur fixe 320px — double bezel cream/white
    <div
      style={{
        width: 320, flexShrink: 0,
        background: '#EDE7DC',
        border: '1px solid rgba(26,20,16,.12)',
        borderRadius: '1.25rem',
        padding: '4px',
        boxShadow: '0 1px 0 rgba(255,255,255,.55) inset, 0 2px 8px rgba(26,20,16,.07)',
        display: 'flex', flexDirection: 'column',
        animation: 'panelIn .45s var(--spring) both',
        overflow: 'hidden',
        maxHeight: 'calc(100svh - 2rem)',
      }}
    >
      <div style={{ background: '#fff', borderRadius: 'calc(1.25rem - 4px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 1px 0 rgba(255,255,255,.9) inset' }}>

        {/* Photo zone — profil hero avec close, nav, badge tier */}
        <div style={{ position: 'relative', overflow: 'hidden', height: 160, flexShrink: 0 }}>
          {detail.photo_profil_signed ? (
            <Image
              src={detail.photo_profil_signed}
              alt={`${detail.prenom} ${detail.nom}`}
              fill
              className="object-cover object-top"
              sizes="320px"
              style={{ cursor: 'zoom-in' }}
              onClick={() => onLightbox(detail.photo_profil_signed!)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#E8E3DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--muted)', fontFamily: "'Montserrat', sans-serif", fontSize: '.6rem' }}>—</span>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 7, right: 7, zIndex: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(247,243,238,.2)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.46rem', color: 'rgba(247,243,238,.8)', cursor: 'pointer' }}
            aria-label="Fermer"
          >✕</button>

          {/* Nav prev/next — compact, superposé en bas à droite */}
          <div style={{ position: 'absolute', bottom: 7, right: 7, zIndex: 2, display: 'flex', alignItems: 'center', gap: '.2rem' }}>
            <button
              onClick={onPrev}
              disabled={detailIdx <= 0}
              style={{ background: 'rgba(247,243,238,.2)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem', color: 'rgba(247,243,238,.8)', cursor: detailIdx <= 0 ? 'not-allowed' : 'pointer', opacity: detailIdx <= 0 ? .4 : 1 }}
              aria-label="Précédent (←)"
            >←</button>
            <span style={{ fontSize: '.35rem', fontFamily: "'Montserrat', sans-serif", color: 'rgba(247,243,238,.7)', fontVariantNumeric: 'tabular-nums', minWidth: '2rem', textAlign: 'center' }}>
              {detailIdx + 1}/{filteredLength}
            </span>
            <button
              onClick={onNext}
              disabled={detailIdx >= filteredLength - 1}
              style={{ background: 'rgba(247,243,238,.2)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem', color: 'rgba(247,243,238,.8)', cursor: detailIdx >= filteredLength - 1 ? 'not-allowed' : 'pointer', opacity: detailIdx >= filteredLength - 1 ? .4 : 1 }}
              aria-label="Suivant (→)"
            >→</button>
          </div>

          {/* Badge tier Ambassadeur */}
          {detail.tier === 'ambassadeur' && (
            <div style={{ position: 'absolute', bottom: 8, left: 7, zIndex: 2, height: 16, borderRadius: '100px', padding: '0 7px', fontSize: '.38rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', background: 'linear-gradient(90deg,#C4973A,#E8C97A)', color: '#1A1410' }}>
              ✦ Ambassadeur
            </div>
          )}
        </div>

        {/* Header identité — nom, méta, pills dispo+tags */}
        <div style={{ padding: '.6rem .7rem .45rem', borderBottom: '1px solid rgba(26,20,16,.07)', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: '1.05rem', letterSpacing: '.02em', color: 'var(--ink)', marginBottom: 2 }}>
            {detail.prenom} {detail.nom}
          </div>
          <div style={{ fontSize: '.4rem', letterSpacing: '.13em', fontWeight: 400, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '.38rem' }}>
            {[
              detail.taille && `${detail.taille} cm`,
              detail.genre,
              detail.ville,
              detail.date_naissance && `${new Date().getFullYear() - new Date(detail.date_naissance).getFullYear()} ans`,
            ].filter(Boolean).join(' · ')}
          </div>
          {/* Pills dispo + tags */}
          <div style={{ display: 'flex', gap: '.22rem', flexWrap: 'wrap' }}>
            {detail.disponibilite && (
              <span style={{ height: 15, borderRadius: '100px', padding: '0 6px', fontSize: '.32rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '.22rem', background: 'rgba(46,125,50,.08)', color: '#2E7D32', border: '1px solid rgba(46,125,50,.18)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2E7D32', display: 'inline-block' }} />
                Disponible
              </span>
            )}
            {(detail.tags ?? []).slice(0, 2).map(tag => (
              <span key={tag} style={{ height: 15, borderRadius: '100px', padding: '0 5px', fontSize: '.32rem', letterSpacing: '.1em', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tab bar — masqué en mode édition */}
        {!editing && (
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(26,20,16,.07)', padding: '0 .5rem', flexShrink: 0 }}>
            {(['Infos', 'Mesures', 'Sessions'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{ flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', color: activeTab === tab ? 'var(--ink)' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
              >
                {tab}
                {activeTab === tab && (
                  <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 1.5, background: 'var(--red)', borderRadius: 1 }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Zone de contenu défilable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 .7rem 1rem' }}>

          {editing ? (
            /* Formulaire d'édition inline */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', paddingTop: '.8rem' }}>
              {([
                ['Prénom',      'prenom'],
                ['Nom',         'nom'],
                ['Email',       'email'],
                ['Téléphone',   'telephone'],
                ['Taille (cm)', 'taille'],
                ['Ville',       'ville'],
                ['Pays',        'pays'],
                ['Instagram',   'instagram'],
                ['Langues',     'langues'],
              ] as [string, string][]).map(([label, key]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                  <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>{label}</span>
                  <input
                    value={(editForm as Record<string, string>)[key] ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.78rem', color: 'var(--ink)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', padding: '.3rem 0', width: '100%' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
              ))}
              {/* Expérience chips */}
              <div>
                <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.18em', display: 'block', marginBottom: '.4rem' }}>Expérience</span>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  {(['Débutant(e)', 'Quelques shootings', 'Expérimenté(e)'] as const).map(exp => (
                    <button key={exp} type="button" onClick={() => setEditForm(f => ({ ...f, experience: exp }))}
                      style={{ fontSize: '.44rem', letterSpacing: '.18em', padding: '.3rem .6rem', cursor: 'pointer', border: `1px solid ${editForm.experience === exp ? 'var(--red)' : 'var(--border)'}`, color: editForm.experience === exp ? 'var(--red)' : 'var(--muted)', background: editForm.experience === exp ? 'rgba(139,0,32,.04)' : 'transparent' }}>
                      {exp}
                    </button>
                  ))}
                </div>
              </div>
              {/* Disponibilité chips */}
              <div>
                <span className="font-medium uppercase text-muted" style={{ fontSize: '.4rem', letterSpacing: '.18em', display: 'block', marginBottom: '.4rem' }}>Disponibilité</span>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  {(['Flexible', 'Jours de semaine', 'Weekends', 'Voyages OK'] as const).map(d => (
                    <button key={d} type="button" onClick={() => setEditForm(f => ({ ...f, disponibilite: d }))}
                      style={{ fontSize: '.44rem', letterSpacing: '.18em', padding: '.3rem .6rem', cursor: 'pointer', border: `1px solid ${editForm.disponibilite === d ? 'var(--red)' : 'var(--border)'}`, color: editForm.disponibilite === d ? 'var(--red)' : 'var(--muted)', background: editForm.disponibilite === d ? 'rgba(139,0,32,.04)' : 'transparent' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          ) : activeTab === 'Mesures' ? (
            /* Onglet Mesures */
            <div>
              <DetailSection label="Corps">
                <DetailRow label="Taille"        value={detail.taille      ? `${detail.taille} cm`      : null} />
                <DetailRow label="Poitrine"       value={detail.poitrine    ? `${detail.poitrine} cm`    : null} />
                <DetailRow label="Tour de taille" value={detail.tour_taille ? `${detail.tour_taille} cm` : null} />
                <DetailRow label="Hanches"        value={detail.hanches     ? `${detail.hanches} cm`     : null} />
                <DetailRow label="Poids"          value={detail.poids       ? `${detail.poids} kg`       : null} />
                <DetailRow label="Pointure EU"    value={detail.pointure    ? String(detail.pointure)    : null} />
                <DetailRow label="Haut"           value={detail.taille_haut} />
                <DetailRow label="Pantalon"       value={detail.taille_bas} />
              </DetailSection>
              <DetailSection label="Apparence">
                <DetailRow label="Teint"   value={detail.teint} />
                <DetailRow label="Yeux"    value={detail.couleur_yeux} />
                <DetailRow label="Cheveux" value={[detail.longueur_cheveux, detail.couleur_cheveux].filter(Boolean).join(' · ') || null} />
                <DetailRow label="Aspect"  value={detail.aspect} />
              </DetailSection>
            </div>

          ) : activeTab === 'Sessions' ? (
            /* Onglet Sessions — historique des participations */
            <div>
              <DetailSection label="Historique">
                {history === null ? (
                  <span className="text-muted font-light" style={{ fontSize: '.62rem' }}>Chargement…</span>
                ) : history.length === 0 ? (
                  <span className="text-muted font-light" style={{ fontSize: '.62rem' }}>Aucune session.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                    {history.map(h => {
                      const meta = STATUS_META[h.status]
                      return (
                        <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-light text-ink truncate" style={{ fontSize: '.72rem' }}>{h.session?.project ?? '—'}</span>
                            <span className="text-muted flex-shrink-0" style={{ fontSize: '.6rem', fontVariantNumeric: 'tabular-nums' }}>
                              {h.session?.date ? new Date(h.session.date + 'T12:00:00').toLocaleDateString('fr-CA') : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium uppercase" style={{ fontSize: '.4rem', letterSpacing: '.18em', color: meta.color }}>
                              {meta.label}{h.role ? ` · ${h.role}` : ''}
                            </span>
                            <span className="flex items-center gap-2 flex-shrink-0">
                              {h.payment_amount != null && (
                                <span className="font-light text-ink" style={{ fontSize: '.62rem' }}>{h.payment_amount} $</span>
                              )}
                              {h.email_clicked_at  ? <span title="Email cliqué"  style={{ fontSize: '.55rem' }}>👁</span>
                               : h.email_bounced_at ? <span title="Email rejeté"  style={{ fontSize: '.55rem', color: 'var(--red)' }}>⚠</span>
                               : h.email_delivered_at ? <span title="Email livré" style={{ fontSize: '.55rem' }}>✉</span> : null}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </DetailSection>
            </div>

          ) : (
            /* Onglet Infos (défaut) — contact, profil, photo body, tags, notes */
            <div>
              {/* Photo full body cliquable */}
              {detail.photo_body_signed && (
                <div style={{ marginTop: '.8rem', marginBottom: '.4rem' }}>
                  <div
                    style={{ position: 'relative', height: 120, background: '#E8E3DC', cursor: 'zoom-in', overflow: 'hidden' }}
                    onClick={() => onLightbox(detail.photo_body_signed!)}
                  >
                    <Image src={detail.photo_body_signed} alt="Full body" fill className="object-cover object-top" sizes="300px" />
                  </div>
                  <div className="font-medium uppercase text-muted text-center mt-1" style={{ fontSize: '.38rem', letterSpacing: '.2em' }}>Full body</div>
                </div>
              )}

              <DetailSection label="Profil casting">
                <DetailRow label="Expérience"    value={detail.experience} />
                <DetailRow label="Disponibilité" value={detail.disponibilite} />
                <DetailRow label="Langues"       value={detail.langues} />
                {detail.date_naissance && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium uppercase text-muted flex-shrink-0" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>Âge</span>
                    <span className="font-light text-ink text-right" style={{ fontSize: '.72rem' }}>
                      {calcAge(detail.date_naissance)} ans
                      <span className="text-muted" style={{ fontSize: '.6rem', marginLeft: '.4rem' }}>
                        ({new Date(detail.date_naissance).toLocaleDateString('fr-CA')})
                      </span>
                    </span>
                  </div>
                )}
                <DetailRow label="Localisation" value={[detail.ville, detail.pays].filter(Boolean).join(', ') || null} />
              </DetailSection>

              <DetailSection label="Contact">
                {/* Email + copier */}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium uppercase text-muted flex-shrink-0" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>Email</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-light text-ink text-right truncate" style={{ fontSize: '.72rem' }}>{detail.email}</span>
                    <button type="button" onClick={() => onCopyToClipboard(detail.email)} className="text-muted transition-colors duration-200 hover:text-ink flex-shrink-0" style={{ background: 'none', fontSize: '.65rem', lineHeight: 1 }} title="Copier">⎘</button>
                  </div>
                </div>
                {/* Téléphone cliquable + copier */}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium uppercase text-muted flex-shrink-0" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>Téléphone</span>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${detail.telephone}`} className="font-light text-right transition-colors duration-200 hover:text-red" style={{ fontSize: '.72rem', color: 'var(--ink)', textDecoration: 'none' }}>
                      {detail.telephone}
                    </a>
                    <button type="button" onClick={() => onCopyToClipboard(detail.telephone)} className="text-muted transition-colors duration-200 hover:text-ink flex-shrink-0" style={{ background: 'none', fontSize: '.65rem', lineHeight: 1 }} title="Copier">⎘</button>
                  </div>
                </div>
                {/* Instagram */}
                {detail.instagram && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium uppercase text-muted flex-shrink-0" style={{ fontSize: '.4rem', letterSpacing: '.18em' }}>Instagram</span>
                    <a href={`https://instagram.com/${detail.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="font-light text-right transition-colors duration-200 hover:text-red" style={{ fontSize: '.72rem', color: 'var(--ink)', textDecoration: 'none' }}>
                      @{detail.instagram.replace(/^@/, '')}
                    </a>
                  </div>
                )}
              </DetailSection>

              <DetailSection label="Tags">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '.5rem' }}>
                  {tagsValue.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.52rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, letterSpacing: '.1em', border: '1px solid var(--red)', color: 'var(--red)', padding: '.2rem .55rem', background: 'rgba(139,0,32,.04)' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '.7rem', lineHeight: 1, padding: 0, opacity: .7 }} aria-label={`Retirer ${tag}`}>×</button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  placeholder="Ajouter un tag…"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.68rem', color: 'var(--ink)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', padding: '.25rem 0', width: '100%' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
                />
              </DetailSection>

              <DetailSection label="Notes internes">
                <textarea
                  value={notesValue}
                  onChange={e => { setNotesValue(e.target.value); setNotesDirty(true) }}
                  onBlur={saveNotes}
                  placeholder="Visible uniquement par l'équipe…"
                  rows={4}
                  style={{
                    fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '.72rem',
                    color: 'var(--ink)', background: 'transparent', border: '1px solid var(--border)',
                    outline: 'none', padding: '.5rem .6rem', width: '100%', resize: 'vertical',
                    lineHeight: 1.6, opacity: notesSaving ? .5 : 1, transition: 'opacity .15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
                />
              </DetailSection>
            </div>
          )}
        </div>

        {/* Actions footer — sticky */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(26,20,16,.07)', background: '#fff' }}>
          {confirmDelete ? (
            /* Confirmation suppression */
            <div style={{ display: 'flex', gap: '.28rem', padding: '.45rem .7rem .55rem' }}>
              <button
                onClick={() => onConfirmDelete(detail.id)}
                style={{ flex: 1, height: 26, borderRadius: '100px', background: '#7a0000', color: '#fff', border: 'none', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Confirmer suppression
              </button>
              <button
                onClick={onCancelDelete}
                style={{ flex: 1, height: 26, borderRadius: '100px', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          ) : editing ? (
            /* Footer édition — enregistrer, annuler, archiver, supprimer */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', padding: '.45rem .7rem .55rem' }}>
              <div style={{ display: 'flex', gap: '.28rem' }}>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{ flex: 1, height: 26, borderRadius: '100px', background: 'var(--ink)', color: 'var(--paper)', border: 'none', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .5 : 1 }}
                >
                  {saving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ flex: 1, height: 26, borderRadius: '100px', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
              <button
                onClick={() => onArchive(detail.id)}
                style={{ height: 26, borderRadius: '100px', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                {detail.archived ? 'Restaurer la candidature' : 'Archiver la candidature'}
              </button>
              <button
                onClick={onRequestDelete}
                style={{ height: 26, borderRadius: '100px', background: 'transparent', color: 'var(--red)', border: '1px solid rgba(139,0,32,.3)', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Supprimer la candidature
              </button>
            </div>
          ) : (
            /* Footer normal — sélectionner, session, éditer */
            <div style={{ display: 'flex', gap: '.28rem', padding: '.45rem .7rem .55rem' }}>
              <button
                type="button"
                onClick={() => onToggleSelectionne ? onToggleSelectionne(detail.id) : onToggleNotified(detail)}
                style={{ flex: 1, height: 26, borderRadius: '100px', background: detail.selectionne ? 'var(--red)' : 'var(--paper)', color: detail.selectionne ? '#fff' : 'var(--ink)', border: `1px solid ${detail.selectionne ? 'var(--red)' : 'rgba(26,20,16,.12)'}`, fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer', boxShadow: detail.selectionne ? '0 1px 5px rgba(139,0,32,.28)' : undefined }}
              >
                {detail.selectionne ? '✓ Sélect.' : 'Sélectionner'}
              </button>
              <button
                type="button"
                onClick={() => onComposeSession?.([detail])}
                style={{ flex: 1, height: 26, borderRadius: '100px', background: 'var(--paper)', color: 'var(--ink)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.38rem', letterSpacing: '.12em', fontWeight: 500, textTransform: 'uppercase', cursor: 'pointer' }}
              >
                + Session
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--paper)', color: 'var(--muted)', border: '1px solid rgba(26,20,16,.12)', fontSize: '.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Modifier le profil"
              >
                ✏
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
