import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../api/client.js'
import { fmtMoney } from '../../lib/format.js'
import AgendaForm from './AgendaForm.jsx'

const TYPE = { rendez_vous: 'Rendez-vous', rappel: 'Rappel', engagement: 'Engagement' }

// semaine : [{ jour: 'Lun', iso, date: 26, events: [{ id, titre, note, montant, type, regle }] }] (lundi → vendredi).
// Un point signale un programme ; un clic sur un jour affiche son détail ; un double-clic permet d'y renseigner un programme.
//   onChanged : appelé après l'ajout ou la suppression d'un programme (la page se recharge)
export default function WeekAgenda({ semaine, onChanged }) {
  const [selected, setSelected] = useState(() => Math.max(0, semaine.findIndex((d) => d.events.length))) // index du jour sélectionné
  const [formIso, setFormIso] = useState(null) // date du programme en cours de saisie
  const [confirmId, setConfirmId] = useState(null) // programme dont la suppression attend une confirmation
  const [error, setError] = useState('')
  const day = semaine[selected]

  const remove = async (id) => {
    setError('')
    try {
      await api(`/caisse/agenda/${id}`, { method: 'DELETE' })
      setConfirmId(null)
      onChanged()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section aria-label="Agenda de la semaine" className="cs-agenda rounded-3xl bg-white p-5">
      <header className="flex items-center justify-between">
        <h3 className="t cs-agenda-title">Agenda</h3>
        <button type="button" className="rounded-full border border-gaia-900/20 px-3 py-0.5">
          <span className="t cs-agenda-all">Tout voir</span>
        </button>
      </header>

      <div className="cs-agenda-days mt-4 grid grid-cols-5">
        {semaine.map((d, i) => {
          const on = i === selected
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={on}
              aria-label={`${d.jour} ${d.date} : ${d.events.length} programme(s). Double-clic pour en ajouter un.`}
              onClick={() => setSelected(i)}
              onDoubleClick={() => {
                setSelected(i)
                setFormIso(d.iso)
              }}
              className={`relative flex flex-col items-center rounded-xl py-2 transition-colors ${
                on ? 'bg-gaia-900 text-white' : 'text-gaia-900 hover:bg-surface'
              }`}
            >
              <span className={`t cs-agenda-dayname ${on ? 'text-white/80' : 'text-muted'}`}>{d.jour}</span>
              <span className="t cs-agenda-daynum mt-1">{d.date}</span>
              {d.events.length > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 size-1.5 rounded-full ${on ? 'bg-white' : 'bg-accent'}`}
                />
              )}
            </button>
          )
        })}
      </div>

      <ul className="cs-agenda-events mt-4 flex flex-col">
        {day.events.length ? (
          day.events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 rounded-2xl bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="t cs-agenda-event">{e.titre}</p>
                <p className="t cs-agenda-note text-gaia-700/60">
                  {TYPE[e.type]}
                  {e.note ? ` · ${e.note}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <p>
                  <span className="t cs-agenda-amount">{e.montant === null ? '' : fmtMoney(e.montant)}</span>{' '}
                  <span className="t cs-agenda-amount-unit">{e.montant === null ? '' : 'xaf'}</span>
                </p>
                {!e.regle &&
                  (confirmId === e.id ? (
                    <button type="button" onClick={() => remove(e.id)} className="t cs-agenda-note rounded-full bg-accent px-2 py-0.5 text-white">
                      Supprimer ?
                    </button>
                  ) : (
                    <button type="button" aria-label={`Supprimer ${e.titre}`} onClick={() => setConfirmId(e.id)} className="rounded-full p-0.5 text-gaia-700/50 hover:text-gaia-900">
                      <X size={16} strokeWidth={2.4} />
                    </button>
                  ))}
              </div>
            </li>
          ))
        ) : (
          <li className="t cs-agenda-note px-1 text-gaia-700/60">Aucun programme ce jour.</li>
        )}
      </ul>
      {error && (
        <p role="alert" className="t cs-agenda-note mt-2 text-danger">
          {error}
        </p>
      )}

      {formIso && <AgendaForm iso={formIso} onClose={() => setFormIso(null)} onSaved={onChanged} />}
    </section>
  )
}
