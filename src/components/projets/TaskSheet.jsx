import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { api } from '../../api/client.js'
import { fmtDateLong, fmtTime } from '../../lib/format.js'

const STATUTS = { aFaire: 'À faire', enCours: 'En cours', faites: 'Faite' }

// Durée entre deux horodatages « AAAA-MM-JJ HH:MM:SS » : « 2 h », « 1 h 30 »
function duree(debut, fin) {
  if (!debut || !fin) return ''
  const min = Math.round((Date.parse(fin.replace(' ', 'T')) - Date.parse(debut.replace(' ', 'T'))) / 60000)
  if (!(min > 0)) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`
}

// Fiche d'une tâche (ouverte au clic) : surtout sa date d'exécution.
//   task : { id, titre, niveau, debut, fin, assignee, notes: [{ id, contenu, fait }] } · colonne : 'aFaire' | 'enCours' | 'faites' · projet : nom du projet
//   projetId : projet de la tâche · onChange : appelé après la validation d'une sous-tâche (le projet se recharge)
export default function TaskSheet({ task, colonne, projet, projetId, onClose, onChange }) {
  const closeRef = useRef(null)
  const [override, setOverride] = useState({}) // sous-tâches cochées/décochées, affichées sans attendre le serveur : { idNote: true | false }
  const [error, setError] = useState('')

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const notes = (task.notes ?? []).map((n) => ({ ...n, fait: override[n.id] ?? n.fait }))
  const faites = notes.filter((n) => n.fait).length

  // Valider / dévalider une sous-tâche : la case change tout de suite, puis l'enregistrement part ; en cas de refus elle revient
  const toggle = async (n) => {
    const fait = !n.fait
    setError('')
    setOverride((o) => ({ ...o, [n.id]: fait }))
    try {
      await api(`/projets/${projetId}/taches/${task.id}/notes/${n.id}`, { method: 'PATCH', body: { fait } })
      onChange?.()
    } catch (err) {
      setOverride((o) => ({ ...o, [n.id]: !fait }))
      setError(err.message)
    }
  }
  const d = duree(task.debut, task.fin)
  const sameDay = task.debut && task.fin && task.debut.slice(0, 10) === task.fin.slice(0, 10)

  return createPortal(
    <div className="pd-sheet fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article role="dialog" aria-modal="true" aria-labelledby="pd-sheet-name" className="pd-sheet-panel relative flex w-full flex-col rounded-3xl bg-white p-7 shadow-2xl">
        <button ref={closeRef} type="button" aria-label="Fermer la fiche" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-gaia-900">
          <X size={16} strokeWidth={2.5} />
        </button>

        <header className="pr-6">
          <h2 id="pd-sheet-name" className="t pd-sheet-name">
            {task.titre}
          </h2>
          <p className="t pd-sheet-sub text-gaia-700/70">
            {projet} · {STATUTS[colonne]}
            {task.niveau === 'urgent' ? ' · Urgente' : ''}
          </p>
        </header>

        <section className="pd-sheet-section">
          <h3 className="t pd-sheet-title">Date d'exécution</h3>
          {task.debut ? (
            <>
              <p className="t pd-sheet-date">{fmtDateLong(task.debut)}</p>
              <p className="t pd-sheet-hours">
                {fmtTime(task.debut)}
                {task.fin ? (sameDay ? ` – ${fmtTime(task.fin)}` : ` → ${fmtDateLong(task.fin)}, ${fmtTime(task.fin)}`) : ''}
                {d ? ` · ${d}` : ''}
              </p>
            </>
          ) : (
            <p className="t pd-sheet-hours text-gaia-700/60">Pas encore planifiée</p>
          )}
        </section>

        <section className="pd-sheet-section">
          <h3 className="t pd-sheet-title">Assignée à</h3>
          <p className="t pd-sheet-hours">{task.assignee ?? '—'}</p>
        </section>

        {notes.length > 0 && (
          <section className="pd-sheet-section">
            <h3 className="t pd-sheet-title">
              Sous-tâches <span className="pd-sheet-count">{faites}/{notes.length}</span>
            </h3>
            <ul className="pd-sheet-notes">
              {notes.map((n) => (
                <li key={n.id}>
                  <button type="button" role="checkbox" aria-checked={n.fait} onClick={() => toggle(n)} className="pd-sheet-note flex w-full items-center text-left">
                    <span className="pd-sheet-box flex shrink-0 items-center justify-center" data-on={n.fait}>
                      {n.fait && <Check size={14} strokeWidth={3.4} />}
                    </span>
                    <span className={`t pd-sheet-hours ${n.fait ? 'text-gaia-700/50 line-through' : ''}`}>{n.contenu}</span>
                  </button>
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="t pd-sheet-hours text-danger">
                {error}
              </p>
            )}
          </section>
        )}
      </article>
    </div>,
    document.body,
  )
}
