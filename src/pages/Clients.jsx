import './clients.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useCardFilters } from '../hooks/useCardFilters.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import ClientsTable from '../components/clients/ClientsTable.jsx'
import { cardLabels, categories, defaultFilters, summarize, toParams } from '../components/clients/filterOptions.js'
import { toQuery } from '../lib/query.js'
import FilterPopup from '../components/ui/FilterPopup.jsx'
import FolderCard from '../components/ui/FolderCard.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import PageShell from '../components/layout/PageShell.jsx'

export default function Clients() {
  const navigate = useNavigate()
  const cf = useCardFilters({ page: 'clients', defaultFilters })
  // Page du tableau (10 clients par page) : on revient à la page 1 dès que le filtre change
  const filterKey = JSON.stringify(cf.applied)
  const [pageSel, setPageSel] = useState({ key: filterKey, page: 1 })
  const page = pageSel.key === filterKey ? pageSel.page : 1
  const { data, error, reload } = useApi(`/clients${toQuery({ ...toParams(cf.applied), page: page > 1 ? page : '' })}`, { keepPrevious: true })
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  // Chaque carte : filtre personnalisé enregistré, nombre de clients qu'il donne, et mots qui le décrivent
  const cartes = data.folders.map((f) => ({ ...f, ...cardLabels(f.filters) }))

  return (
    <PageShell>
      <PageHeader
        action={
          <button
            type="button"
            onClick={() => navigate('/clients/nouveau')}
            className="t cl-new-btn self-start rounded-full bg-gaia-700 px-5 py-1 text-white"
          >
            + Nouveau client
          </button>
        }
      />

      <div className="cl-folders mt-6 grid">
        {cartes.map((c, i) => (
          <FolderCard
            key={c.slot}
            prefix="cl-folder"
            title={c.title}
            count={c.count}
            caption={c.caption}
            selected={cf.active === i}
            onSelect={() => cf.selectCard(i, cartes)}
            tabActive={cf.open === i}
            onTabClick={() => cf.openFilters(i, cartes)}
          />
        ))}
      </div>

      {cf.open !== null && (
        <FilterPopup
          prefix="cl-pop"
          categories={categories}
          summary={summarize(cf.filters)}
          value={cf.filters}
          onChange={cf.setFilters}
          onApply={() => cf.save(reload)}
          onReset={() => cf.setFilters(defaultFilters)}
          onClose={() => cf.setOpen(null)}
          error={cf.saveError}
        />
      )}

      {cf.isFiltered && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <p className="t cl-pop-summary text-gaia-700/60">Filtre appliqué : {summarize(cf.applied)}</p>
          <button type="button" onClick={cf.clear} className="rounded-full bg-gaia-200 px-3 py-0.5 text-gaia-700">
            <span className="t cl-pop-btn">Effacer le filtre</span>
          </button>
        </div>
      )}

      <div className="cl-table pb-6">
        <ClientsTable clients={data.clients} />
        <Pagination
          prefix="cl-pager"
          page={data.page}
          pages={data.pages}
          total={data.total}
          size={data.size}
          noun="clients"
          onChange={(n) => setPageSel({ key: filterKey, page: n })}
        />
      </div>
    </PageShell>
  )
}
