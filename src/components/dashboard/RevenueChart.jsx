import { fmtDate, fmtMoney } from '../../lib/format.js'

const bars = ['bg-gaia-900', 'bg-gaia-500', 'bg-gaia-200']

// Plus petit "chiffre rond" (1, 2, 2.5, 5 × 10^n) qui contient la valeur : échelle de l'axe.
function niceMax(v) {
  if (v <= 0) return 100000
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp
}

// chart : { debut, fin, mois: [{ label, facture, encaisse, decaisse }], totaux: { facture, encaisse, decaisse } }
export default function RevenueChart({ chart }) {
  const data = chart.mois
  const MAX = niceMax(Math.max(0, ...data.flatMap((m) => [m.facture, m.encaisse, m.decaisse])))
  const ticks = [MAX, (MAX * 3) / 4, MAX / 2, MAX / 4, 0]
  const series = [
    { label: 'Facturé', total: chart.totaux.facture, bar: bars[0] },
    { label: 'Encaissé', total: chart.totaux.encaisse, bar: bars[1] },
    { label: 'Decaissé', total: chart.totaux.decaisse, bar: bars[2] },
  ]

  return (
    <div>
      <ul className="d-chart-legend flex flex-wrap px-4">
        {series.map((s) => (
          <li key={s.label} className="d-chart-legend-item flex items-start">
            <span className={`mt-2 size-2.5 rounded-full ${s.bar}`} />
            <div>
              <p className="t d-chart-legend-label">{s.label}</p>
              <p className="mt-1">
                <span className="t d-chart-legend-total">{fmtMoney(s.total)}</span>{' '}
                <span className="t d-chart-legend-unit">xaf</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2 px-2">
        <div className="relative h-[160px] w-16 shrink-0 text-right text-muted">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${100 - (t / MAX) * 100}%` }}
            >
              <span className="t d-chart-ytick">{Math.round(t / 1000)}k</span>{' '}
              <span className="t d-chart-ytick-unit">xaf</span>
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-[160px]">
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-black/10"
                style={{ top: `${100 - (t / MAX) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end justify-around px-2">
              {data.map((d, k) => (
                <div key={`${d.label}${k}`} className="flex h-full items-end gap-[3px]">
                  {[d.facture, d.encaisse, d.decaisse].map((val, i) => (
                    <div
                      key={i}
                      title={`${d.label} · ${series[i].label} : ${fmtMoney(val)} xaf`}
                      className={`w-[14px] rounded-t-sm ${bars[i]}`}
                      style={{ height: `${(val / MAX) * 100}%` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex justify-around px-2 text-muted">
            {data.map((d, k) => (
              <span key={`${d.label}${k}`} className="t d-chart-month w-[48px] text-center">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-right">
        <span className="t d-chart-period-label">Du :</span>{' '}
        <span className="t d-chart-period-value">
          {fmtDate(chart.debut)} &nbsp;- {fmtDate(chart.fin)}
        </span>
      </p>
    </div>
  )
}
