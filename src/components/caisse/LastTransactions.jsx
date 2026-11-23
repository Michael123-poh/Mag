import { ArrowDownLeft, Building2, Landmark, Package, PiggyBank, Receipt, Users } from 'lucide-react'
import { fmtDate, fmtMoney } from '../../lib/format.js'

// Icône d'une sortie selon son type de transaction
const ICONES = { salaire: Users, loyer: Building2, impot: Landmark, epargne: PiggyBank, achat_stock: Package }

// Les dernières transactions d'un sens : 8 encaissements ou 8 décaissements, de la plus récente à la plus ancienne.
//   titre : « Encaissements » / « Décaissements » · sortie : true pour les décaissements
//   items : [{ id, libelle, montant, date, compte, type, code }] · onAll : ouvre l'historique complet
export default function LastTransactions({ titre, sortie = false, items, onAll }) {
  return (
    <section aria-label={titre} className="cs-panel flex flex-col rounded-3xl bg-white p-5">
      <header className="flex items-baseline justify-between">
        <h3 className="t cs-panel-title">{titre}</h3>
        <button type="button" onClick={onAll} className="t cs-panel-count text-gaia-700/60 underline">
          {items.length} dernier{items.length > 1 ? 's' : ''} · tout voir
        </button>
      </header>

      <ul className="cs-list mt-4 flex flex-col">
        {items.length === 0 && <li className="t cs-row-sub py-3 text-gaia-700/60">Aucune transaction pour le moment.</li>}
        {items.map((t) => {
          const Icon = sortie ? (ICONES[t.code] ?? Receipt) : ArrowDownLeft
          return (
            <li key={t.id} className="cs-row flex items-center">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gaia-200/70 text-gaia-700">
                <Icon size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="t cs-row-name truncate">{t.libelle || t.type}</p>
                <p className="t cs-row-sub truncate text-gaia-700/60">
                  {fmtDate(t.date)} · {t.compte}
                </p>
              </div>
              <p className="whitespace-nowrap">
                <span className={`t cs-out-amount ${sortie ? '' : 'text-gaia-700'}`}>
                  {sortie ? '−' : '+'} {fmtMoney(t.montant)}
                </span>{' '}
                <span className="t cs-out-unit">xaf</span>
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
