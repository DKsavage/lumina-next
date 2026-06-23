// Toast — notification temporaire affichée en haut de l'écran.
// Disparaît automatiquement après 3.5s via showToast (géré dans le parent).
interface Props {
  message: string
}

export function Toast({ message }: Props) {
  if (!message) return null
  return (
    <div
      className="fixed top-6 left-1/2 z-[300] font-medium"
      style={{
        transform:    'translateX(-50%)',
        fontFamily:   "'Montserrat', sans-serif",
        fontSize:     '.62rem',
        letterSpacing: '.08em',
        background:   'var(--ink)',
        color:        'var(--paper)',
        padding:      '.75rem 1.5rem',
        boxShadow:    '0 4px 24px rgba(0,0,0,.18)',
        whiteSpace:   'nowrap',
      }}
    >
      {message}
    </div>
  )
}
