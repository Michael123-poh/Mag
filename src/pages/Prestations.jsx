import './prestations.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useCardFilters } from '../hooks/useCardFilters.js'
import { fmtDate, fmtMoney } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageShell from '../components/layout/PageShell.jsx'
import { cardLabels, categories, defaultFilters, summarize, toParams } from '../components/prestations/filterOptions.js'
import { toQuery } from '../lib/query.js'
import PrestationRow from '../components/prestations/PrestationRow.jsx'
import PrestationSheet from '../components/prestations/PrestationSheet.jsx'
import FilterPopup from '../components/ui/FilterPopup.jsx'
import FolderCard from '../components/ui/FolderCard.jsx'

// Correspondance entre les valeurs de la base et les textes / styles de l'écran
const STATUT = { a_faire: 'afaire', en_cours: 'encours', livre: 'livre' }
const PAIEMENT = { payee: 'Payé', partielle: 'Accompte', impayee: 'Non - Payé', non_facture: 'Non facturé' }

export default function Prestations() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null) // prestation dont la fiche est ouverte
  const cf = useCardFilters({ page: 'prestations', defaultFilters })
  const { data, error, reload } = useApi(`/prestations${toQuery(toParams(cf.applied))}`, { keepPrevious: true })
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  // Chaque carte : filtre personnalisé enregistré, nombre de prestations qu'il donne, et mots qui le décrivent
  const cartes = data.folders.map((f) => ({ ...f, ...cardLabels(f.filters) }))

  return (
    <PageShell>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="t pr-title">Prestation</h2>
          <p className="t pr-subtitle">Suivi des prestations d'impression</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/prestations/nouveau')}
          className="t pr-new-btn rounded-full bg-gaia-700 px-5 py-1 text-white"
        >
          + Nouveau bon
        </button>
      </header>

      <div className="pr-folders grid">
        {cartes.map((c, i) => (
          <FolderCard
            key={c.slot}
            prefix="pr-folder"
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
          prefix="pr-pop"
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
          <p className="t pr-pop-summary text-gaia-700/60">Filtre appliqué : {summarize(cf.applied)}</p>
          <button type="button" onClick={cf.clear} className="rounded-full bg-gaia-200 px-3 py-0.5 text-gaia-700">
            <span className="t pr-pop-btn">Effacer le filtre</span>
          </button>
        </div>
      )}

      <div className="pr-list pb-6">
        {data.prestations.length === 0 && (
          <p className="t pr-details py-8 text-center text-gaia-700/60">Aucune prestation ne correspond à ce filtre.</p>
        )}
        {data.prestations.map((p) => (
          <PrestationRow
            key={p.id}
            code={p.reference}
            titre={p.titre}
            client={p.client}
            prix={fmtMoney(p.tarif)}
            statut={STATUT[p.statut]}
            paiement={PAIEMENT[p.paiement]}
            echeance={fmtDate(p.echeance)}
            onOpen={() => setOpenId(p.id)}
          />
        ))}
      </div>
      {openId !== null && <PrestationSheet id={openId} ids={data.prestations.map((p) => p.id)} onOpen={setOpenId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </PageShell>
  )
}
