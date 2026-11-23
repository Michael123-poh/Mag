import { Fragment } from 'react'

const bars = {
  urgent: 'bg-accent',
  normal: 'bg-gaia-500',
}

// Une tâche : petite carte de hauteur fixe (barre de couleur à gauche, titre, avancement des sous-étapes)
//   task : { id, titre, niveau, notes: [{ contenu, fait }] }
export function TaskCard({ task }) {
  const notes = task.notes ?? []
  const done = notes.filter((n) => n.fait).length
  return (
    <div className="pd-task-card flex items-stretch" title={notes.length ? notes.map((n) => `${n.fait ? '✓' : '-'} ${n.contenu}`).join('\n') : undefined}>
      <span className={`pd-task-bar shrink-0 rounded-full ${bars[task.niveau]}`} />
      <div className="flex min-w-0 flex-col justify-center">
        <p className="t pd-task pd-task-clamp">{task.titre}</p>
        {notes.length > 0 && (
          <p className="t pd-task-note text-gaia-700/60">
            ✓ {done}/{notes.length}
          </p>
        )}
      </div>
    </div>
  )
}

// Une colonne du tableau (À faire, Faites, En cours) : ses tâches, et un emplacement vide là où la tâche glissée tombera.
//   tasks    : tâches de la colonne (sans celle qui est en train d'être glissée)
//   slot     : null ou { index, height } = emplacement réservé à la tâche glissée
//   setRef   : reçoit l'élément de la colonne (pour savoir au-dessus de quelle colonne se trouve le pointeur)
//   onPointerDown : (event, task) au début d'un glissement
export default function TaskListCard({ titre, tasks, slot, setRef, onPointerDown }) {
  const placeholder = slot && <li aria-hidden="true" className="pd-slot" style={{ height: slot.height }} />
  return (
    <section ref={setRef} className="pd-column rounded-3xl bg-white px-7 pb-5 pt-5">
      <h3 className="t pd-card-title">{titre}</h3>
      <ul className="pd-tasks mt-4">
        {tasks.map((t, i) => (
          <Fragment key={t.id}>
            {slot?.index === i && placeholder}
            <li data-task-id={t.id} onPointerDown={(e) => onPointerDown(e, t)} className="pd-task-item">
              <TaskCard task={t} />
            </li>
          </Fragment>
        ))}
        {slot && slot.index >= tasks.length && placeholder}
      </ul>
    </section>
  )
}
