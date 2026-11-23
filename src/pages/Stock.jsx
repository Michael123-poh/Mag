import { useState } from 'react'
import './stock.css'
import { useApi } from '../hooks/useApi.js'
import { toQuery } from '../lib/query.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import ProductSheet from '../components/stock/ProductSheet.jsx'
import StockFilterBar from '../components/stock/StockFilterBar.jsx'
import StockTable from '../components/stock/StockTable.jsx'

export default function Stock() {
  const [params, setParams] = useState({}) // recherche + filtres de la barre
  const { data, error, reload } = useApi(`/stock${toQuery(params)}`, { keepPrevious: true })
  const [selected, setSelected] = useState(null) // produit dont la fiche est ouverte (dernière version connue)
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  return (
    <PageShell>
      <PageHeader
        prefix="stk-hdr"
        lead="Suivi"
        name=""
        subtitle="Hebdomadaire des consommables"
      />

      <div className="stk-filters-wrap">
        <StockFilterBar onChange={setParams} />
      </div>

      <div className="stk-table pb-6">
        <StockTable stocks={data.stocks} onSelect={setSelected} />
      </div>

      {selected && (
        <ProductSheet
          produit={data.stocks.find((s) => s.id === selected.id) ?? selected}
          ids={data.stocks.map((s) => s.id)}
          onOpen={(id) => setSelected(data.stocks.find((s) => s.id === id) ?? selected)}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      )}
    </PageShell>
  )
}
