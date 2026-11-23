import './dashboard.css'
import { useApi } from '../hooks/useApi.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import ActivityCard from '../components/dashboard/ActivityCard.jsx'
import ClientsDebts from '../components/dashboard/ClientsDebts.jsx'
import FlowCard from '../components/dashboard/FlowCard.jsx'
import GainsParProduit from '../components/dashboard/GainsParProduit.jsx'
import ProjetsEnCours from '../components/dashboard/ProjetsEnCours.jsx'
import RevenueChart from '../components/dashboard/RevenueChart.jsx'
import {
  AlertStockCard,
  NoteCard,
  ProgressionCard,
} from '../components/dashboard/SideWidgets.jsx'

export default function Dashboard() {
  const { data, error, reload } = useApi('/dashboard')
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  return (
    <PageShell>
      <PageHeader />
      {/* Grille 2 × 2 : "À encaisser" démarre à la même hauteur que "Gains net / Produit" */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-x-10 xl:gap-y-6">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-5 md:grid-cols-2">
            <FlowCard entrees={data.flux.entrees} sorties={data.flux.sorties} />
            <ActivityCard projets={data.projets} impression={data.impression} />
          </div>
          <RevenueChart chart={data.chart} />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <AlertStockCard count={data.alertStock.count} />
            <ProgressionCard pct={data.progression.pct} />
          </div>
          <NoteCard notes={data.notes} />
          <ProjetsEnCours projets={data.projetsEnCours} />
        </aside>

        <div className="grid min-w-0 gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
          <GainsParProduit gains={data.gains} />
        </div>

        <ClientsDebts debts={data.debts} />
      </div>
    </PageShell>
  )
}
