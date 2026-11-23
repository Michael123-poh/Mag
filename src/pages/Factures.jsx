import './factures.css'
import { useState } from 'react'
import { toQuery } from '../lib/query.js'
import { useApi } from '../hooks/useApi.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import InvoiceCard from '../components/factures/InvoiceCard.jsx'
import SearchFilterBar from '../components/ui/SearchFilterBar.jsx'

const selects = [
  {
    key: 'statut',
    label: 'Statut',
    options: [
      { value: '', label: 'Tous les statuts' },
      { value: 'payee', label: 'Payée' },
      { value: 'partielle', label: 'Partielle' },
      { value: 'impayee', label: 'Impayée' },
    ],
  },
  {
    key: 'periode',
    label: 'Période',
    options: [
      { value: '', label: 'Toutes les périodes' },
      { value: 'mois', label: 'Ce mois' },
      { value: '3m', label: '3 mois' },
      { value: '6m', label: '6 mois' },
      { value: '1a', label: '1 an' },
    ],
  },
]

export default function Factures() {
  const [params, setParams] = useState({}) // recherche + filtres de la barre
  const { data, error, reload } = useApi(`/factures${toQuery(params)}`, { keepPrevious: true })
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  return (
    <PageShell>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="t fa-title">Factures</h2>
          <p className="t fa-subtitle">Facturation et encaissements</p>
        </div>
        <button type="button" className="rounded-full bg-gaia-700 px-5 py-1 text-white">
          <span className="t fa-new-btn">+ Nouvelle facture</span>
        </button>
      </header>

      <div className="fa-filters-wrap">
        <SearchFilterBar
          prefix="fa"
          placeholder="Rechercher une facture ou un client…"
          selects={selects}
          onChange={setParams}
          ariaLabel="Recherche et filtres des factures"
        />
      </div>

      <div className="fa-list flex flex-col pb-6">
        {data.factures.length === 0 && (
          <p className="t fa-number py-8 text-center text-gaia-700/60">Aucune facture ne correspond à ce filtre.</p>
        )}
        {data.factures.map((f) => (
          <InvoiceCard key={f.id} f={f} />
        ))}
      </div>
    </PageShell>
  )
}
