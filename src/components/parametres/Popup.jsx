import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Fenêtre de saisie de la page Paramètre : un titre, un contenu, fermeture par la croix, Échap ou un clic à côté.
export default function Popup({ titre, sousTitre, onClose, children }) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="ps-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={titre} className="ps-popup relative flex w-full flex-col rounded-3xl bg-white shadow-2xl">
        <button ref={closeRef} type="button" aria-label="Fermer" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-gaia-900">
          <X size={16} strokeWidth={2.5} />
        </button>
        <h2 className="t ps-popup-title">{titre}</h2>
        {sousTitre && <p className="t ps-popup-sub">{sousTitre}</p>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
