import { useMemo, useState } from 'react'
import { fmtMoney as fmt } from '../../lib/format.js'

// Couleurs des parts (la part sélectionnée devient orange et sort du camembert)
const COULEURS = [
  { fill: 'fill-gaia-900', dot: 'bg-gaia-900' },
  { fill: 'fill-gaia-500', dot: 'bg-gaia-500' },
  { fill: 'fill-gaia-200', dot: 'bg-gaia-200' },
  { fill: 'fill-gaia-700', dot: 'bg-gaia-700' },
  { fill: 'fill-[#6f9bd1]', dot: 'bg-[#6f9bd1]' },
  { fill: 'fill-[#d8e5f5]', dot: 'bg-[#d8e5f5]' },
]

const R = 48
const PULL = 5 // distance dont la part sélectionnée sort du camembert
const rad = (deg) => (deg * Math.PI) / 180
const point = (deg) => `${(50 + R * Math.cos(rad(deg))).toFixed(2)} ${(50 + R * Math.sin(rad(deg))).toFixed(2)}`

function Stat({ label, value }) {
  return (
    <div>
      <p className="t d-gains-stat-label text-muted">{label}</p>
      <p className="t d-gains-stat-value">{value}</p>
    </div>
  )
}

// gains : [{ nom, type ('Prestation' | 'Projet'), ca, gain, nb }] — gain = chiffre d'affaires - coût de revient
export default function GainsParProduit({ gains }) {
  const [selected, setSelected] = useState(0)

  // Angles de départ/fin de chaque part (sens horaire, départ en haut)
  const parts = useMemo(() => {
    const total = gains.reduce((s, g) => s + g.gain, 0)
    const sweeps = gains.map((g) => (total > 0 ? (g.gain / total) * 360 : 0))
    return gains.map((g, i) => {
      const start = -90 + sweeps.slice(0, i).reduce((x, y) => x + y, 0)
      return { ...g, ...COULEURS[i % COULEURS.length], start, end: start + sweeps[i], pct: total > 0 ? (g.gain / total) * 100 : 0 }
    })
  }, [gains])

  if (!parts.length) {
    return (
      <>
        <div className="rounded-2xl bg-white px-4 py-4">
          <h3 className="t d-gains-title">Gains net / Produit</h3>
        </div>
        <div className="flex flex-col rounded-2xl bg-white px-5 py-4">
          <p className="t d-gains-type uppercase text-muted">Aucune donnée</p>
        </div>
      </>
    )
  }

  const p = parts[Math.min(selected, parts.length - 1)]
  const sel = parts.indexOf(p)
  const mid = rad((p.start + p.end) / 2)

  return (
    <>
      <div className="rounded-2xl bg-white px-4 py-4">
        <h3 className="t d-gains-title">Gains net / Produit</h3>
        <svg
          viewBox="-6 -6 112 112"
          className="mx-auto mt-3 w-[160px]"
          role="group"
          aria-label="Répartition des gains nets par produit"
        >
          {parts.map((part, i) => {
            const isSel = i === sel
            const large = part.end - part.start > 180 ? 1 : 0
            return (
              <path
                key={`${part.type}${part.nom}`}
                d={`M50 50 L${point(part.start)} A${R} ${R} 0 ${large} 1 ${point(part.end)} Z`}
                className={`cursor-pointer outline-none stroke-white transition-transform duration-200 ${
                  isSel ? 'fill-accent' : part.fill
                }`}
                strokeWidth="0.8"
                style={{
                  transform: isSel
                    ? `translate(${(Math.cos(mid) * PULL).toFixed(2)}px, ${(Math.sin(mid) * PULL).toFixed(2)}px)`
                    : 'none',
                }}
                role="button"
                tabIndex={0}
                aria-label={`${part.nom} : ${part.pct.toFixed(0)} %`}
                aria-pressed={isSel}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelected(i)
                  }
                }}
              />
            )
          })}
        </svg>
      </div>

      <div className="flex flex-col rounded-2xl bg-white px-5 py-4">
        <p className="t d-gains-type uppercase text-muted">{p.type}</p>
        <h4 className="t d-gains-name">{p.nom}</h4>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4">
          <p>
            <span className="t d-gains-net">{fmt(p.gain)}</span>{' '}
            <span className="t d-gains-net-unit">xaf</span>
          </p>
          <p className="t d-gains-share text-accent">{p.pct.toFixed(0)} % des gains</p>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
          <div className="h-full rounded-full bg-accent" style={{ width: `${p.pct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Stat label="Chiffre d'affaires" value={`${fmt(p.ca)} xaf`} />
          <Stat label="Charges" value={`${fmt(p.ca - p.gain)} xaf`} />
          <Stat label="Marge" value={`${p.ca ? Math.round((p.gain / p.ca) * 100) : 0} %`} />
          <Stat label={p.type === 'Projet' ? 'Projets' : 'Prestations'} value={p.nb} />
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
          {parts.map((part, i) => (
            <li key={`${part.type}${part.nom}`}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={`flex items-center gap-1.5 ${i === sel ? '' : 'opacity-60'}`}
              >
                <span className={`size-2 rounded-full ${i === sel ? 'bg-accent' : part.dot}`} />
                <span className="t d-gains-legend">{part.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
