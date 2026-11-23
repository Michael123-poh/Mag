import { Boxes } from 'lucide-react'
import VoirLink from '../ui/VoirLink.jsx'

export function AlertStockCard({ count }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center">
      <p className="flex items-center justify-center gap-1.5">
        <Boxes size={16} strokeWidth={2.4} />
        <span className="t d-alert-title">Alert Stock</span>
      </p>
      <p className="t d-alert-number mt-1 text-warn">{count}</p>
      <p className="t d-alert-caption text-warn">{count > 1 ? 'produits concernés' : 'produit concerné'}</p>
      <VoirLink to="/stock" textClass="d-alert-voir" className="mt-2" />
    </div>
  )
}

export function ProgressionCard({ pct }) {
  const up = pct === null || pct >= 0
  const color = up ? 'text-gaia-500' : 'text-danger'
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center">
      <p className="t d-prog-title">Progression</p>
      <p className={`t d-prog-number mt-1 ${color}`}>{pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}</p>
      <p className={`t d-prog-caption ${color}`}>{up ? 'de hausse' : 'de baisse'}</p>
      <VoirLink to="/rapports" textClass="d-prog-voir" className="mt-2" />
    </div>
  )
}

export function NoteCard({ notes }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="t d-note-title">Note :</p>
      <ul className="pl-1">
        {notes.map((n) => (
          <li key={n.id} className="t d-note-item">
            - {n.contenu}
          </li>
        ))}
        {!notes.length && <li className="t d-note-item text-muted">Aucune note.</li>}
      </ul>
    </div>
  )
}
