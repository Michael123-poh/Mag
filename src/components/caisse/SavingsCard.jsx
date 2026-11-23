import { TrendingDown, TrendingUp } from 'lucide-react'

import { fmtMoney as fmt } from '../../lib/format.js'

// epargne : { montant (taux % du bénéfice du mois), semaines: [{ label, v }] (la dernière = semaine en cours),
//             prevision: { bon, atteint (% de l'objectif) } }
export default function SavingsCard({ epargne: e }) {
  const { montant: epargne, semaines, prevision } = e
  const maxSemaine = Math.max(1, ...semaines.map((s) => s.v))
  const Icon = prevision.bon ? TrendingUp : TrendingDown
  return (
    <section
      aria-label="Épargne du mois"
      className="cs-savings flex aspect-square flex-col justify-between rounded-3xl bg-white p-5"
    >
      <div>
        <p className="t cs-savings-title">Épargné ce mois</p>
        <p className="mt-2">
          <span className="t cs-savings-amount">{fmt(epargne)}</span>{' '}
          <span className="t cs-savings-unit">xaf</span>
        </p>
      </div>

      <div className="cs-savings-bars flex items-end">
        {semaines.map((s, i) => (
          <div key={s.label} className="flex h-full flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                title={`${s.label} : ${fmt(s.v)} xaf`}
                className={`w-full rounded-t-lg ${i === semaines.length - 1 ? 'bg-accent' : 'bg-gaia-200'}`}
                style={{ height: `${(s.v / maxSemaine) * 100}%` }}
              />
            </div>
            <span className="t cs-savings-bar-label text-gaia-700/60">{s.label}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="t cs-forecast-title">Prévision du mois</p>
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-0.5 ${
              prevision.bon ? 'bg-gaia-200 text-gaia-900' : 'bg-danger text-white'
            }`}
          >
            <Icon size={14} strokeWidth={2.6} />
            <span className="t cs-forecast-pill">{prevision.bon ? 'Bon mois' : 'Mois difficile'}</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
          <div className="h-full rounded-full bg-gaia-500" style={{ width: `${Math.min(100, prevision.atteint)}%` }} />
        </div>
        <p className="t cs-forecast-note mt-1 text-gaia-700/60">
          {prevision.atteint} % de l'objectif
        </p>
      </div>
    </section>
  )
}
