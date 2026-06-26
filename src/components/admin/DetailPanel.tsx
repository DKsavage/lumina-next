// DetailPanel — panneau latéral droit affichant le profil complet d'un candidat.
// Slide-in depuis la droite à l'ouverture, slide-out à la fermeture via AnimatePresence.
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Candidature } from '@/types/candidature'
import { calcAge } from '@/types/candidature'

interface Props {
  detail:           Candidature
  detailIdx:        number
  filteredLength:   number
  selected:         boolean
  confirmDelete:    boolean
  onToggleSelect:   (id: string) => void
  onPrev:           () => void
  onNext:           () => void
  onClose:          () => void
  onLightbox:       (src: string) => void
  onToggleNotified: (c: Candidature) => void
  onArchive:        (id: string) => void
  onRequestDelete:  () => void
  onConfirmDelete:  (id: string) => void
  onCancelDelete:   () => void
  onCopyToClipboard:(text: string) => void
  onEdit:           (patch: Partial<Candidature>) => Promise<boolean>
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
  detail, detailIdx, filteredLength, selected, confirmDelete,
  onToggleSelect, onPrev, onNext, onClose, onLightbox,
  onToggleNotified, onArchive, onRequestDelete, onConfirmDelete, onCancelDelete, onCopyToClipboard, onEdit,
}: Props) {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className="fixed inset-0 z-[150] flex justify-end"
      style={{ background: 'rgba(12,11,9,.45)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{    x: '100%' }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
        className="relative h-full overflow-y-auto bg-paper"
        style={{ width: '100%', maxWidth: '26rem', borderLeft: '1px solid var(--border)' }}
      >

        {/* Header */}
        <div className="sticky top-0 bg-paper z-10 flex items-start justify-between" style={{ padding: '1.8rem 1.8rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.8rem', color: 'var(--ink)', lineHeight: 1.15 }}>
              {detail.prenom}<br />{detail.nom}
            </div>
            {detail.genre && (
              <span className="font-medium uppercase text-muted" style={{ fontSize: '.42rem', letterSpacing: '.25em', borderLeft: '2px solid var(--red)', paddingLeft: '.5rem', marginTop: '.5rem', display: 'block' }}>
                {detail.genre}
              </span>
            )}
            {detail.selectionne && (
              <span className="font-medium uppercase" style={{ fontSize: '.38rem', letterSpacing: '.2em', color: '#fff', background: 'rgba(20,120,60,.85)', padding: '.15rem .45rem', marginTop: '.4rem', display: 'inline-block' }}>
                Notifié(e)
              </span>
            )}
          </div>

          {/* Nav prev/next + fermer */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-3" style={{ marginTop: '.2rem' }}>
            <button onClick={onPrev} disabled={detailIdx <= 0} className="transition-opacity duration-200 text-muted hover:text-ink" style={{ background: 'none', fontSize: '1rem', lineHeight: 1, padding: '.3rem', opacity: detailIdx <= 0 ? .25 : 1 }} aria-label="Précédent (←)">←</button>
            <span className="text-muted" style={{ fontSize: '.44rem', minWidth: '2.5rem', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {detailIdx + 1}/{filteredLength}
            </span>
            <button onClick={onNext} disabled={detailIdx >= filteredLength - 1} className="transition-opacity duration-200 text-muted hover:text-ink" style={{ background: 'none', fontSize: '1rem', lineHeight: 1, padding: '.3rem', opacity: detailIdx >= filteredLength - 1 ? .25 : 1 }} aria-label="Suivant (→)">→</button>
            <button onClick={onClose} className="text-muted transition-colors duration-200 hover:text-red" style={{ background: 'none', fontSize: '1.4rem', lineHeight: 1, marginLeft: '.4rem' }} aria-label="Fermer">×</button>
          </div>
        </div>

        {/* Photos cliquables → lightbox */}
        <div className="grid grid-cols-2 gap-[.5rem]" style={{ padding: '1.2rem 1.8rem .8rem' }}>
          {([
            { src: detail.photo_profil_signed, label: 'Visage' },
            { src: detail.photo_body_signed,   label: 'Full body' },
          ] as const).map(({ src, label }) => (
            <div key={label}>
              <div
                className="relative overflow-hidden bg-[#E8E3DC]"
                style={{ aspectRatio: '3/4', cursor: src ? 'zoom-in' : 'default' }}
                onClick={() => src && onLightbox(src)}
              >
                {src ? (
                  <Image src={src} alt={label} fill className="object-cover object-top" sizes="13vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-muted font-light" style={{ fontSize: '.6rem' }}>—</span>
                  </div>
                )}
              </div>
              <div className="font-medium uppercase text-muted text-center mt-1" style={{ fontSize: '.38rem', letterSpacing: '.2em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Infos / Formulaire d'édition */}
        {editing ? (
          <div style={{ padding: '0 1.8rem 2rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
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
        ) : (
        <div style={{ padding: '0 1.8rem 6rem' }}>
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
        </div>
        )}

        {/* Footer — actions */}
        <div className="sticky bottom-0 bg-paper" style={{ padding: '1rem 1.8rem', borderTop: '1px solid var(--border)' }}>
          {editing ? (
            <div className="flex gap-2" style={{ marginBottom: '.6rem' }}>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 font-medium uppercase transition-opacity duration-200"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em', background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '.7rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .5 : 1 }}
              >
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.2em', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.7rem 1rem', cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full font-medium uppercase transition-opacity duration-200 hover:opacity-70"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.7rem', cursor: 'pointer', marginBottom: '.6rem' }}
            >
              Modifier le profil
            </button>
          )}
          <button
            onClick={() => onToggleSelect(detail.id)}
            className="w-full font-medium uppercase transition-colors duration-200 active:scale-[0.96] transition-transform"
            style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.52rem', letterSpacing: '.28em', background: selected ? 'transparent' : 'var(--red)', color: selected ? 'var(--red)' : 'var(--paper)', border: '1px solid var(--red)', padding: '.9rem', cursor: 'pointer', marginBottom: '.6rem' }}
          >
            {selected ? '✓ Sélectionné — Retirer' : 'Sélectionner ce modèle'}
          </button>

          {detail.selectionne && (
            <button
              onClick={() => onToggleNotified(detail)}
              className="w-full font-medium uppercase transition-all duration-200 hover:opacity-70"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em', background: 'transparent', color: 'rgba(20,120,60,.9)', border: '1px solid rgba(20,120,60,.4)', padding: '.7rem', cursor: 'pointer', marginBottom: '.6rem' }}
            >
              Annuler la notification
            </button>
          )}

          <button
            onClick={() => onArchive(detail.id)}
            className="w-full font-medium uppercase transition-opacity duration-200 hover:opacity-70"
            style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.7rem', cursor: 'pointer', marginBottom: '.6rem' }}
          >
            {detail.archived ? 'Restaurer la candidature' : 'Archiver la candidature'}
          </button>

          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirmDelete(detail.id)}
                className="flex-1 font-medium uppercase transition-opacity duration-200 hover:opacity-80 active:scale-[0.96] transition-transform"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.2em', background: '#7a0000', color: '#fff', border: 'none', padding: '.7rem', cursor: 'pointer' }}
              >
                Confirmer la suppression
              </button>
              <button
                onClick={onCancelDelete}
                className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.2em', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.7rem 1rem', cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={onRequestDelete}
              className="w-full font-medium uppercase transition-opacity duration-200 hover:opacity-70"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.28em', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.7rem', cursor: 'pointer' }}
            >
              Supprimer la candidature
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
