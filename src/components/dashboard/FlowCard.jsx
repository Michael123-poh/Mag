import { useState } from 'react'
import { ChevronDown, CircleArrowDown, CircleArrowUp } from 'lucide-react'
import { fmtMoney } from '../../lib/format.js'
import VoirLink from '../ui/VoirLink.jsx'

function Row({ icon: Icon, label, values, tone }) {
  const dark = tone === 'dark'
  const [periode, setPeriode] = useState('weekly')
  return (
    <div
      className={`px-5 text-white ${
        dark ? 'relative z-10 min-h-[112px] rounded-3xl bg-gaia-700 py-4' : '-mt-6 flex-1 pb-4 pt-10'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon size={22} strokeWidth={2.2} />
          <span className="t d-flow-label">{label}</span>
        </span>
        <span className="relative">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            aria-label={`Période ${label}`}
            className="t d-flow-period appearance-none rounded-full bg-white py-0.5 pl-3 pr-6 text-gaia-900 outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gaia-900"
          />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="pl-6">
          <span className="t d-flow-amount">{fmtMoney(values[periode])}</span>{' '}
          <span className="t d-flow-unit">xaf</span>
        </p>
        <VoirLink textClass="d-flow-voir" />
      </div>
    </div>
  )
}

// entrees / sorties : { weekly, monthly, yearly } en xaf
export default function FlowCard({ entrees, sorties }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-gaia-500">
      <Row icon={CircleArrowDown} label="Entrées" values={entrees} tone="dark" />
      <Row icon={CircleArrowUp} label="Sorties" values={sorties} tone="light" />
    </div>
  )
}
