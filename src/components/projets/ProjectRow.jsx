import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProgressRing from './ProgressRing.jsx'

export default function ProjectRow({ id, type, titre, client, pct, echeance }) {
  return (
    <article className="flex items-end justify-between gap-6 border-b border-gaia-700/40 py-4">
      <div className="min-w-0">
        <p className="w-fit uppercase text-gaia-700/70">
          <span className="t pj-row-type">{type}</span>
        </p>
        <h3 className="t pj-row-titre mt-3">{titre}</h3>
        <p className="t pj-row-client">{client}</p>
        <Link
          to={`/projets/${id}`}
          className="t pj-row-voir mt-3 inline-flex items-center gap-1 uppercase text-gaia-700/70"
        >
          Voir
          <ArrowUpRight size={13} strokeWidth={2.5} />
        </Link>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <ProgressRing pct={pct} />
        <p>
          <span className="t pj-row-ech-label mr-1 text-gaia-700/70">ÉCH.</span>
          <span className="t pj-row-ech">{echeance}</span>
        </p>
      </div>
    </article>
  )
}
