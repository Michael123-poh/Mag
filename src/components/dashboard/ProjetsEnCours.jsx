import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/format.js'

function tone(pct) {
  if (pct >= 80) return 'text-gaia-500'
  if (pct >= 30) return 'text-warn'
  return 'text-danger'
}

// projets : [{ id, nom, debut, avancement }]
export default function ProjetsEnCours({ projets }) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white px-4 py-4">
      <h3 className="t d-proj-title">Projet en cours</h3>
      <ol className="mt-3 mb-3 space-y-3">
        {!projets.length && <li className="t d-proj-name text-muted">Aucun projet en cours.</li>}
        {projets.map((p, i) => (
          <li key={p.id} className="flex items-start gap-3">
            <span className="t d-proj-index w-4">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <p className="t d-proj-name truncate">{p.nom}</p>
              <p className="t d-proj-date text-muted">date debut : {fmtDate(p.debut)}</p>
            </div>
            <span className={`t d-proj-pct ${tone(p.avancement)}`}>
              {String(p.avancement).padStart(2, '0')}%
            </span>
          </li>
        ))}
      </ol>
      <Link
        to="/projets"
        className="t d-proj-voir mt-auto inline-flex items-center gap-1 self-end rounded-full bg-accent px-3 py-0.5 text-white"
      >
        Voir
        <ArrowUpRight size={12} strokeWidth={2.5} />
      </Link>
    </div>
  )
}
