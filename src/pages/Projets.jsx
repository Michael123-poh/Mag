import './projets.css'
import { useApi } from '../hooks/useApi.js'
import { fmtDate } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import MemberCard from '../components/projets/MemberCard.jsx'
import MonthCalendar from '../components/projets/MonthCalendar.jsx'
import ProjectRow from '../components/projets/ProjectRow.jsx'

export default function Projets() {
  const { data, error, reload } = useApi('/projets')
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  return (
    <PageShell>
      <div className="pj-top grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <MonthCalendar mois={data.mois} calendrier={data.calendrier} />
        <div className="pj-members flex flex-col">
          {data.equipe.map((m) => (
            <MemberCard key={m.id} nom={m.nom} projets={m.projets} tone={m.tone} />
          ))}
        </div>
      </div>

      <div className="pj-list">
        {data.projets.map((p) => (
          <ProjectRow key={p.id} id={p.id} type={p.type} titre={p.titre} client={p.client} pct={p.avancement} echeance={fmtDate(p.echeance)} />
        ))}
      </div>
    </PageShell>
  )
}
