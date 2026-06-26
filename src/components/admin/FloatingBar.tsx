// FloatingBar — barre flottante en bas de page quand ≥1 candidature sélectionnée.
// Expose : effacer sélection, notifier (avec confirmation 2 étapes), composer session.
'use client'

interface Props {
  selectedCount:    number
  selectedBreakdown: string
  notifying:        boolean
  confirmNotify:    boolean
  onClearSelection: () => void
  onRequestNotify:  () => void
  onConfirmNotify:  () => void
  onCancelNotify:   () => void
  onComposeSession: () => void
  onCopyList:       () => void
}

export function FloatingBar({
  selectedCount, selectedBreakdown,
  notifying, confirmNotify,
  onClearSelection, onRequestNotify, onConfirmNotify, onCancelNotify, onComposeSession, onCopyList,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '1.2rem 2rem', boxShadow: '0 -4px 32px rgba(0,0,0,.18)' }}
    >
      {/* Gauche — compteur + breakdown */}
      <div className="flex items-center gap-4">
        <button
          onClick={onClearSelection}
          className="flex items-center justify-center transition-opacity duration-200 hover:opacity-60"
          style={{ width: '1.6rem', height: '1.6rem', border: '1px solid rgba(247,243,238,.2)', background: 'none' }}
          aria-label="Effacer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
        <div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.1rem' }}>
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </span>
          {selectedBreakdown && (
            <span className="font-medium uppercase" style={{ fontSize: '.4rem', letterSpacing: '.2em', color: 'rgba(247,243,238,.45)', marginLeft: '.75rem' }}>
              {selectedBreakdown}
            </span>
          )}
        </div>
      </div>

      {/* Droite — actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCopyList}
          className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
          style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em', color: 'rgba(247,243,238,.7)', background: 'none', border: 'none', padding: '.65rem .8rem', cursor: 'pointer' }}
        >
          ⎘ Copier liste
        </button>
        {confirmNotify ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onConfirmNotify}
              disabled={notifying}
              className="font-medium uppercase transition-opacity duration-200 active:scale-[0.96] transition-transform"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em', color: 'var(--paper)', background: 'var(--red)', padding: '.65rem 1.2rem', opacity: notifying ? .5 : 1, cursor: notifying ? 'not-allowed' : 'pointer' }}
            >
              {notifying ? 'Envoi…' : `Confirmer — ${selectedCount} modèle${selectedCount > 1 ? 's' : ''}`}
            </button>
            {!notifying && (
              <button
                onClick={onCancelNotify}
                className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em', color: 'rgba(247,243,238,.5)', background: 'none', padding: '.65rem .8rem' }}
              >
                Annuler
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onRequestNotify}
            disabled={notifying}
            className="font-medium uppercase transition-opacity duration-200 hover:opacity-70"
            style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em', color: 'var(--paper)', background: 'none', border: '1px solid rgba(247,243,238,.3)', padding: '.65rem 1.2rem' }}
          >
            Notifier la sélection
          </button>
        )}
        <button
          onClick={onComposeSession}
          className="font-medium uppercase active:scale-[0.96] transition-transform"
          style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '.44rem', letterSpacing: '.25em', background: 'var(--red)', color: 'var(--paper)', padding: '.65rem 1.2rem' }}
        >
          Composer session
        </button>
      </div>
    </div>
  )
}
