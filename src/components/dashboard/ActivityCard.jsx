import { FolderOpen, Printer } from 'lucide-react'
import { fmtMoney } from '../../lib/format.js'
import VoirLink from '../ui/VoirLink.jsx'

function Row({ icon: Icon, label, stats, tone }) {
  const dark = tone === 'dark'
  return (
    <div
      className={`px-5 text-white ${
        dark ? 'relative z-10 min-h-[112px] rounded-3xl bg-gaia-700 py-4' : '-mt-6 flex-1 pb-4 pt-10'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon size={22} strokeWidth={2.2} />
          <span className="t d-act-label">{label}</span>
        </span>
        <VoirLink textClass="d-act-voir" />
      </div>
      <div className="mt-3 flex items-end justify-around text-center ml-40">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="t d-act-value">{fmtMoney(s.value)}</p>
            <p className="t d-act-caption mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// projets : { enCours, termines, total } · impression : [{ label, value }] (feuilles sur 7 jours, relevés machine)
export default function ActivityCard({ projets, impression }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-gaia-500">
      <Row
        icon={FolderOpen}
        label="Projet"
        tone="dark"
        stats={[
          { value: projets.enCours, label: 'En cours' },
          { value: projets.termines, label: 'Terminé' },
          { value: projets.total, label: 'Total' },
        ]}
      />
      <Row
        icon={Printer}
        label="Impression"
        tone="light"
        stats={impression}
      />
    </div>
  )
}
