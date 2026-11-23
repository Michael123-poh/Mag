import { Landmark, Smartphone, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './caisse.css'
import { useApi } from '../hooks/useApi.js'
import { fmtMoney as fmt } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import AccountCard from '../components/caisse/AccountCard.jsx'
import LastTransactions from '../components/caisse/LastTransactions.jsx'
import SavingsCard from '../components/caisse/SavingsCard.jsx'
import WeekAgenda from '../components/caisse/WeekAgenda.jsx'

// Aspect de chaque compte (icône et couleur de fond)
const LOOK = {
  caisse: { icon: Wallet, tone: 'bg-gaia-700' },
  banque: { icon: Landmark, tone: 'bg-gaia-500' },
  mobile: { icon: Smartphone, tone: 'bg-gaia-900' },
}

export default function Caisse() {
  const navigate = useNavigate()
  const { data, error, reload } = useApi('/caisse', { keepPrevious: true }) // pendant un rechargement (programme ajouté…) la page reste affichée
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />
  const { comptes, total } = data

  return (
    <PageShell>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="t cs-title">Comptes</h2>
          <p className="t cs-subtitle">Vos transactions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate('/caisse/historique')} className="rounded-full bg-white px-5 py-1 text-gaia-900">
            <span className="t cs-new-btn">Historique</span>
          </button>
          <button type="button" className="rounded-full bg-gaia-700 px-5 py-1 text-white">
            <span className="t cs-new-btn">+ Nouvelle transaction</span>
          </button>
        </div>
      </header>

      {/* Grille 2 × 2 : comptes | total, puis encaissements + décaissements | agenda, épargne… */}
      <div className="cs-grid grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="cs-accounts grid min-w-0 md:grid-cols-3">
          {comptes.map((c) => (
            <AccountCard key={c.code} nom={c.nom} montant={fmt(c.montant)} icon={LOOK[c.code].icon} tone={LOOK[c.code].tone} />
          ))}
        </div>

        <div className="cs-total flex flex-col justify-center">
          <p className="t cs-total-label">Total</p>
          <p>
            <span className="t cs-total-amount">{fmt(total)}</span>{' '}
            <span className="t cs-total-unit">xaf</span>
          </p>
        </div>

        <div className="cs-main grid min-w-0 md:grid-cols-2">
          <LastTransactions titre="Encaissements" items={data.encaissements} onAll={() => navigate('/caisse/historique')} />
          <LastTransactions titre="Décaissements" sortie items={data.decaissements} onAll={() => navigate('/caisse/historique')} />
        </div>

        <aside className="cs-aside flex flex-col">
          <WeekAgenda semaine={data.agenda.semaine} onChanged={reload} />
          <SavingsCard epargne={data.epargne} />
        </aside>
      </div>
    </PageShell>
  )
}
