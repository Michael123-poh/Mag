import Avatar from '../ui/Avatar.jsx'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmtDate, fmtMoney as fmt } from '../../lib/format.js'

const TONES = ['teal', 'cream', 'orange', 'dark']

// jours = nombre de jours avant l'échéance (0 = aujourd'hui, négatif = en retard)
function badge(jours) {
  const label = jours < 0 ? `+${-jours} j` : jours === 0 ? "Aujourd'hui" : `J-${jours}`
  const classes =
    jours <= 3 ? 'bg-danger text-white' : jours <= 7 ? 'bg-accent text-white' : 'bg-gaia-200 text-gaia-900'
  return { label, classes }
}

// debts : [{ clientId, nom, ref, montant, echeance, jours }] triés par échéance la plus proche
export default function ClientsDebts({ debts }) {
  const total = debts.reduce((s, d) => s + d.montant, 0)

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white px-4 py-4">
      <h3 className="t d-debt-title">À encaisser</h3>
      <p className="t d-debt-total text-muted">
        {debts.length ? `${fmt(total)} xaf dus par ${debts.length} client${debts.length > 1 ? 's' : ''}` : 'Rien à encaisser'}
      </p>

      <ul className="mt-3 space-y-3">
        {debts.map((d) => {
          const b = badge(d.jours)
          return (
            <li key={d.clientId} className="flex items-center gap-3">
              <Avatar tone={TONES[d.clientId % TONES.length]} size={32} className="ring-0" />
              <div className="min-w-0 flex-1">
                <p className="t d-debt-name truncate">{d.nom}</p>
                <p className="t d-debt-ref truncate text-muted">
                  éch. {fmtDate(d.echeance)} · {d.ref}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="t d-debt-amount">{fmt(d.montant)} xaf</span>
                <span className={`t d-debt-badge rounded-full px-2 ${b.classes}`}>{b.label}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <Link
        to="/clients"
        className="t d-debt-voir mt-3 inline-flex items-center gap-1 self-end rounded-full bg-accent px-3 py-0.5 text-white"
      >
        Voir
        <ArrowUpRight size={12} strokeWidth={2.5} />
      </Link>
    </div>
  )
}
