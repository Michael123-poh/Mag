import './caisseHistorique.css'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { fmtDate, fmtMoney, fmtTime } from '../lib/format.js'
import { toQuery } from '../lib/query.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import PageShell from '../components/layout/PageShell.jsx'

const COMPTES = [
  { value: '', label: 'Tous les comptes' },
  { value: 'caisse', label: 'Caisse' },
  { value: 'banque', label: 'Banque' },
  { value: 'mobile', label: 'Mobile' },
]
const SENS = [
  { value: '', label: 'Tout' },
  { value: 'encaissement', label: 'Entrées' },
  { value: 'decaissement', label: 'Sorties' },
]

function Chips({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="ch-chips flex flex-wrap">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className="ch-chip">
          <span className="t ch-chip-text">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// Historique de toutes les transactions (entrées et sorties, tous les comptes) : filtres, totaux, 15 par page.
export default function CaisseHistorique() {
  const navigate = useNavigate()
  const [f, setF] = useState({ compte: '', sens: '', q: '', page: 1 })
  const timer = useRef(null)
  const { data, error, reload } = useApi(`/caisse/historique${toQuery({ compte: f.compte, sens: f.sens, q: f.q, page: f.page > 1 ? f.page : '' })}`, { keepPrevious: true })
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  const change = (patch) => setF((prev) => ({ ...prev, ...patch, page: 1 })) // un autre filtre : retour à la page 1
  const onSearch = (value) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => change({ q: value }), 250)
  }

  return (
    <PageShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="t ch-title">Historique</h2>
          <p className="t ch-subtitle">Toutes les transactions</p>
        </div>
        <button type="button" onClick={() => navigate('/caisse')} className="t ch-back self-start text-gaia-700">
          ← Retour aux comptes
        </button>
      </header>

      <div className="ch-totals grid sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-5">
          <p className="t ch-total-label text-gaia-700/70">Entrées</p>
          <p>
            <span className="t ch-total-value">+ {fmtMoney(data.entrees)}</span> <span className="t ch-total-unit">xaf</span>
          </p>
        </div>
        <div className="rounded-3xl bg-white p-5">
          <p className="t ch-total-label text-gaia-700/70">Sorties</p>
          <p>
            <span className="t ch-total-value">− {fmtMoney(data.sorties)}</span> <span className="t ch-total-unit">xaf</span>
          </p>
        </div>
      </div>

      <div className="ch-filters flex flex-wrap items-center">
        <input type="search" aria-label="Rechercher une transaction" placeholder="Rechercher…" defaultValue={f.q} onChange={(e) => onSearch(e.target.value)} className="t ch-search rounded-full bg-white outline-none" />
        <Chips label="Compte" value={f.compte} options={COMPTES} onChange={(compte) => change({ compte })} />
        <Chips label="Sens" value={f.sens} options={SENS} onChange={(sens) => change({ sens })} />
      </div>

      <div className="ch-table overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1">
          <thead>
            <tr className="text-left uppercase text-gaia-700/60">
              <th className="pb-2 font-normal"><span className="t ch-th">Date</span></th>
              <th className="pb-2 font-normal"><span className="t ch-th">Transaction</span></th>
              <th className="pb-2 font-normal"><span className="t ch-th">Compte</span></th>
              <th className="pb-2 text-right font-normal"><span className="t ch-th">Montant</span></th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gaia-700/60">
                  <span className="t ch-line-sub">Aucune transaction ne correspond à ce filtre.</span>
                </td>
              </tr>
            )}
            {data.transactions.map((t) => (
              <tr key={t.id} className="ch-row">
                <td className="py-3 align-top">
                  <p className="t ch-line">{fmtDate(t.date)}</p>
                  <p className="t ch-line-sub text-gaia-700/60">{fmtTime(t.date)}</p>
                </td>
                <td className="align-top">
                  <p className="t ch-line">{t.libelle || t.type}</p>
                  <p className="t ch-line-sub text-gaia-700/60">
                    {t.type}
                    {t.origine ? ` · ${t.origine}` : ''}
                    {t.par ? ` · ${t.par}` : ''}
                  </p>
                </td>
                <td className="align-top">
                  <span className="t ch-line">{t.compteNom}</span>
                </td>
                <td className="text-right align-top">
                  <span className={`t ch-amount ${t.sens === 'encaissement' ? 'text-gaia-900' : 'text-accent'}`}>
                    {t.sens === 'encaissement' ? '+' : '−'} {fmtMoney(t.montant)} xaf
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={data.page} pages={data.pages} total={data.total} size={data.size} noun="transactions" onChange={(page) => setF((prev) => ({ ...prev, page }))} prefix="cl-pager" />
    </PageShell>
  )
}
