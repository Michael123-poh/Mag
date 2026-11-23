import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api/client.js'
import TaskListCard, { TaskCard } from './TaskListCard.jsx'

const COLUMNS = [
  { key: 'aFaire', titre: 'Taches à faire', statut: 'a_faire' },
  { key: 'faites', titre: 'Tâches faites', statut: 'fait' },
  { key: 'enCours', titre: 'En cours', statut: 'en_cours' },
]
const START_DRAG_PX = 6 // le glissement ne démarre qu'après ce déplacement : un simple clic ne déplace rien
const EDGE_PX = 60 // près du haut / du bas de la zone qui défile, elle défile toute seule
const EDGE_SPEED = 14

// Les trois colonnes de tâches, façon Trello : on glisse une tâche au-dessus ou au-dessous d'une autre,
// ou vers une autre colonne (son statut change alors avec la colonne).
//   initial   : { aFaire, faites, enCours } venant de l'API (le composant est recréé à chaque changement de ces données)
//   projetId  : projet affiché
//   onChange  : appelé après l'enregistrement d'un déplacement
//   onOpen    : appelé avec la tâche quand on clique dessus (sans la glisser)
export default function TaskBoard({ initial, projetId, onChange, onOpen }) {
  const [cols, setCols] = useState(initial)
  const colsRef = useRef(initial) // dernière version des colonnes (lue pendant le glissement)
  const [drag, setDrag] = useState(null) // tâche en cours de glissement : { task, w, h, x, y }
  const [target, setTarget] = useState(null) // où elle tomberait : { col, index }
  const [error, setError] = useState('')
  const colEls = useRef({}) // éléments des colonnes
  const session = useRef(null) // glissement en cours (pas besoin de re-dessiner à chaque mouvement)

  const applyCols = (next) => {
    colsRef.current = next
    setCols(next)
  }

  // Au-dessus de quelle colonne et de quelle position se trouve le pointeur ?
  const locate = (x, y) => {
    let col = COLUMNS[0].key
    let best = Infinity
    for (const c of COLUMNS) {
      const el = colEls.current[c.key]
      if (!el) continue
      const r = el.getBoundingClientRect()
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0
      if (dx < best) {
        best = dx
        col = c.key
      }
    }
    let index = 0
    colEls.current[col]?.querySelectorAll('[data-task-id]').forEach((li) => {
      const r = li.getBoundingClientRect()
      if (y > r.top + r.height / 2) index++
    })
    return { col, index }
  }

  // Défilement automatique de la page quand on glisse près du bord
  const autoScroll = (y) => {
    const scroller = colEls.current[COLUMNS[0].key]?.closest('.overflow-y-auto')
    if (!scroller) return
    const r = scroller.getBoundingClientRect()
    if (y < r.top + EDGE_PX) scroller.scrollTop -= EDGE_SPEED
    else if (y > r.bottom - EDGE_PX) scroller.scrollTop += EDGE_SPEED
  }

  const commit = async (task, from, to) => {
    const before = colsRef.current
    const fromIndex = before[from].findIndex((t) => t.id === task.id)
    if (from === to.col && fromIndex === to.index) return // pas bougé

    const next = { ...before, [from]: before[from].filter((t) => t.id !== task.id) }
    const column = [...next[to.col]]
    column.splice(Math.min(to.index, column.length), 0, task)
    next[to.col] = column
    applyCols(next)
    setError('')

    try {
      await api(`/projets/${projetId}/taches/${task.id}/deplacer`, {
        method: 'PATCH',
        body: { statut: COLUMNS.find((c) => c.key === to.col).statut, index: to.index },
      })
      onChange()
    } catch (err) {
      applyCols(initial) // le serveur a refusé : on remet l'ordre d'origine
      setError(err.message)
    }
  }

  const onPointerDown = (e, task) => {
    if (e.button !== 0) return
    const from = COLUMNS.find((c) => colsRef.current[c.key].some((t) => t.id === task.id)).key
    const rect = e.currentTarget.getBoundingClientRect()
    const s = { task, from, startX: e.clientX, startY: e.clientY, offX: e.clientX - rect.left, offY: e.clientY - rect.top, w: rect.width, h: rect.height, active: false, target: null }
    session.current = s

    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
      document.body.classList.remove('pd-dragging')
      session.current = null
      setDrag(null)
      setTarget(null)
    }
    const move = (ev) => {
      if (!s.active) {
        if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) < START_DRAG_PX) return
        s.active = true
        document.body.classList.add('pd-dragging')
      }
      s.target = locate(ev.clientX, ev.clientY)
      setDrag({ task, w: s.w, h: s.h, x: ev.clientX - s.offX, y: ev.clientY - s.offY })
      setTarget(s.target)
      autoScroll(ev.clientY)
    }
    const up = () => {
      const dragged = s.active && s.target
      const clicked = !s.active
      stop()
      if (dragged) commit(task, from, s.target)
      else if (clicked) onOpen?.(task)
    }
    const cancel = () => stop()
    const key = (ev) => ev.key === 'Escape' && stop()

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
  }

  return (
    <>
      <div className="pd-cards mt-6 grid items-start lg:grid-cols-3">
        {COLUMNS.map((c) => (
          <TaskListCard
            key={c.key}
            titre={c.titre}
            tasks={cols[c.key].filter((t) => t.id !== drag?.task.id)}
            slot={drag && target?.col === c.key ? { index: target.index, height: drag.h } : null}
            setRef={(el) => (colEls.current[c.key] = el)}
            onPointerDown={onPointerDown}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="t pd-task-note mt-3 text-danger">
          {error}
        </p>
      )}

      {drag &&
        createPortal(
          <div className="pd-ghost" style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}>
            <TaskCard task={drag.task} />
          </div>,
          document.body,
        )}
    </>
  )
}
