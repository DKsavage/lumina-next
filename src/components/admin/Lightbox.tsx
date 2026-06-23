// Lightbox — affiche une photo en plein écran avec fond flouté.
// Fermeture : clic sur le fond ou le bouton ×. Aucune logique métier ici.
import Image from 'next/image'

interface Props {
  src:     string
  onClose: () => void
}

export function Lightbox({ src, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: 'rgba(12,11,9,.92)', backdropFilter: 'blur(8px)', cursor: 'zoom-out' }}
      onClick={onClose}
    >
      <Image
        src={src}
        alt="Photo plein écran"
        width={800}
        height={1100}
        className="object-contain"
        style={{ maxWidth: '90vw', maxHeight: '90dvh', width: 'auto', height: 'auto' }}
      />
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-paper transition-opacity duration-200 hover:opacity-60"
        style={{ background: 'none', fontSize: '1.8rem', lineHeight: 1 }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  )
}
