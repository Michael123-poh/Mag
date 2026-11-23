import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './projetDetail.css'
import { useApi } from '../hooks/useApi.js'
import { fmtDate } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import TaskBoard from '../components/projets/TaskBoard.jsx'
import TaskSheet from '../components/projets/TaskSheet.jsx'
import TaskTimeline from '../components/projets/TaskTimeline.jsx'
import WeekNav from '../components/projets/WeekNav.jsx'
import PaymentsSheet from '../components/projets/PaymentsSheet.jsx'

export default function ProjetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [semaine, setSemaine] = useState(null) // semaine du planning (lundi, AAAA-MM-JJ) ; null = la semaine en cours
  const [payOpen, setPayOpen] = useState(false) // fenêtre « Gestion des paiements »
  const [openTask, setOpenTask] = useState(null) // identifiant de la tâche dont la fiche est ouverte
  const { data, error, reload } = useApi(`/projets/${encodeURIComponent(id)}${semaine ? `?semaine=${semaine}` : ''}`, { keepPrevious: true })

  // Flèche gauche / droite : projet précédent / suivant de la liste des projets (on s'arrête aux extrémités).
  // Sans effet quand une fenêtre est ouverte, pendant un glissement de tâche, ou quand on tape dans un champ.
  const voisins = data?.voisins
  const current = data && String(data.id) === id // les données affichées sont bien celles du projet de l'adresse
  const blocked = payOpen || openTask !== null
  useEffect(() => {
    if (!current || blocked) return
    const onKey = (e) => {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || document.body.classList.contains('pd-dragging')) return
      const to = e.key === 'ArrowLeft' ? voisins?.precedent : voisins?.suivant
      if (!to) return
      e.preventDefault()
      setSemaine(null) // le planning repart de la semaine en cours pour le nouveau projet
      navigate(`/projets/${to}`)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, blocked, voisins, navigate])

  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  // Le tableau est recréé quand l'ordre, le statut ou l'avancement (sous-tâches cochées) des tâches change côté serveur
  // Retrouve une tâche (et sa colonne) à partir de son identifiant
  const found = openTask
    ? ['aFaire', 'enCours', 'faites'].flatMap((col) => data.taches[col].map((task) => ({ task, col }))).find((x) => x.task.id === openTask)
    : null
  const boardKey = ['aFaire', 'faites', 'enCours'].map((k) => data.taches[k].map((t) => `${t.id}:${t.notes.filter((n) => n.fait).length}`).join('.')).join('|')

  return (
    <PageShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="t pd-title">{data.titre}</h2>
          <p className="mt-1">
            <span className="t pd-date-start">Début {fmtDate(data.debut)}</span>
            <span className="t pd-date-sep mx-2">|</span>
            <span className="t pd-date-end">Fin {fmtDate(data.fin)}</span>
          </p>
        </div>

        {/* Les paiements du projet, service par service (fenêtre) */}
        <button type="button" onClick={() => setPayOpen(true)} className="pd-repart-btn flex flex-col items-start text-left">
          <span className="t pd-repart text-gaia-700">Gestion des</span>
          <span className="t pd-repart text-gaia-700">paiements</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/projets/${data.id}/taches/nouveau`)}
          className="t pd-new-btn rounded-full bg-gaia-700 px-4 py-1 text-white"
        >
          + créer Tache
        </button>
      </header>

      <TaskBoard key={boardKey} initial={data.taches} projetId={data.id} onChange={reload} onOpen={(task) => setOpenTask(task.id)} />

      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="t pd-section">Gestion des Taches</h3>
        <WeekNav planning={data.planning} onChange={setSemaine} />
      </div>
      <TaskTimeline planning={data.planning} onOpen={setOpenTask} />

      {payOpen && <PaymentsSheet projetId={data.id} onClose={() => setPayOpen(false)} />}

      {found && <TaskSheet key={found.task.id} task={found.task} colonne={found.col} projet={data.titre} projetId={data.id} onClose={() => setOpenTask(null)} onChange={reload} />}
    </PageShell>
  )
}
