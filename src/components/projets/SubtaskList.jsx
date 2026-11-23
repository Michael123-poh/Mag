import { X } from 'lucide-react'
import { TextInput } from '../wizard/Fields.jsx'

// Sous-tâches d'une tâche : on tape, Entrée (ou « Ajouter ») les met dans la liste, la croix en retire une.
//   notes : liste · draft : texte en cours de saisie · onNotes / onDraft : reçoivent la nouvelle valeur
export default function SubtaskList({ notes, draft, onNotes, onDraft }) {
  const add = () => {
    const text = draft.trim()
    if (!text) return
    onNotes([...notes, text])
    onDraft('')
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <TextInput
          value={draft}
          onChange={onDraft}
          maxLength={255}
          placeholder="Ex. Valider la maquette avec le client"
          aria-label="Sous-tâche"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" onClick={add} disabled={!draft.trim()} className="t pn-add shrink-0 rounded-full bg-gaia-700 text-white">
          Ajouter
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="pn-lines">
          {notes.map((n, i) => (
            <li key={`${i}-${n}`} className="pn-line flex items-center justify-between gap-4">
              <p className="t pn-line-name min-w-0">
                <span className="tn-num">{i + 1}.</span> {n}
              </p>
              <button type="button" aria-label={`Retirer la sous-tâche ${n}`} onClick={() => onNotes(notes.filter((_, j) => j !== i))} className="pn-line-remove">
                <X size={18} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
