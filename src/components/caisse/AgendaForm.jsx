import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { api } from '../../api/client.js'
import { fmtDateLong } from '../../lib/format.js'

const TYPES = [
  { value: 'rendez_vous', label: 'Rendez-vous' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'engagement', label: 'Engagement' },
]

// Programme d'une date de l'agenda (ouvert par un double-clic sur le jour).
//   iso : date du jour (AAAA-MM-JJ) · onSaved : appelé après l'enregistrement · onClose : ferme la fenêtre
//   Un engagement a un montant (sortie d'argent prévue) ; un rendez-vous ou un rappel n'en a pas.
export default function AgendaForm({ iso, onClose, onSaved }) {
  const [v, setV] = useState({ titre: '', description: '', type: 'rendez_vous', montant: '' })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))
  const errors = {}
  if (v.titre.trim().length < 2) errors.titre = 'Indiquez le programme'
  if (v.type === 'engagement' && !(Number(v.montant) >= 1)) errors.montant = 'Indiquez le montant'

  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length > 0 || busy) return
    setBusy(true)
    setError('')
    try {
      await api('/caisse/agenda', {
        method: 'POST',
        body: { titre: v.titre.trim(), description: v.description.trim() || undefined, date: iso, type: v.type, montant: v.type === 'engagement' ? Number(v.montant) : undefined },
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const field = 't cs-form-input w-full rounded-xl bg-surface outline-none'

  return createPortal(
    <div className="cs-form fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="cs-form-title" onSubmit={submit} noValidate className="cs-form-panel relative flex w-full flex-col rounded-3xl bg-white p-7 shadow-2xl">
        <button type="button" aria-label="Fermer" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-gaia-900">
          <X size={16} strokeWidth={2.5} />
        </button>

        <h2 id="cs-form-title" className="t cs-form-title">
          Programme du jour
        </h2>
        <p className="t cs-form-sub text-gaia-700/70">{fmtDateLong(iso)}</p>

        <label className="cs-form-group">
          <span className="t cs-form-label">Programme</span>
          <input ref={firstRef} type="text" value={v.titre} maxLength={200} onChange={(e) => set('titre')(e.target.value)} data-invalid={tried && !!errors.titre} className={`${field} cs-form-field`} placeholder="Ex. Rendez-vous fournisseur" />
          {tried && errors.titre && <span className="t cs-form-error">{errors.titre}</span>}
        </label>

        <label className="cs-form-group">
          <span className="t cs-form-label">Détail (facultatif)</span>
          <input type="text" value={v.description} maxLength={255} onChange={(e) => set('description')(e.target.value)} className={`${field} cs-form-field`} />
        </label>

        <div className="cs-form-group">
          <span className="t cs-form-label">Type</span>
          <div role="radiogroup" aria-label="Type" className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.value} type="button" role="radio" aria-checked={v.type === t.value} onClick={() => set('type')(t.value)} className="cs-form-chip">
                <span className="t cs-form-chip-text">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {v.type === 'engagement' && (
          <label className="cs-form-group">
            <span className="t cs-form-label">Montant prévu (xaf)</span>
            <input
              type="text"
              inputMode="numeric"
              value={v.montant ? Number(v.montant).toLocaleString('fr-FR') : ''}
              onChange={(e) => set('montant')(e.target.value.replace(/\D/g, '').slice(0, 10))}
              data-invalid={tried && !!errors.montant}
              className={`${field} cs-form-field`}
              aria-label="Montant prévu"
            />
            {tried && errors.montant && <span className="t cs-form-error">{errors.montant}</span>}
          </label>
        )}

        {error && (
          <p role="alert" className="t cs-form-error">
            {error}
          </p>
        )}

        <div className="cs-form-actions flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="t cs-form-btn text-gaia-700">
            Annuler
          </button>
          <button type="submit" disabled={busy} className="t cs-form-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
