import { Ellipsis } from 'lucide-react'
import { fmtDate, fmtMoney } from '../../lib/format.js'
import { PAIEMENT, RECEPTION } from './statuts.js'

const th = 'pb-2 font-normal uppercase text-gaia-700/60'

// onSelect : appelé avec le produit quand on clique sur une ligne (ouvre la fiche produit).
export default function StockTable({ stocks, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-1 uppercase">
        <thead>
          <tr>
            <th className={`${th} text-left`}><span className="t stk-th">Produit</span></th>
            <th className={th}><span className="t stk-th">Quantité</span></th>
            <th className={th}><span className="t stk-th">Prix</span></th>
            <th className={th}><span className="t stk-th">Dernière livraison</span></th>
            <th className={th}><span className="t stk-th">Statut</span></th>
            <th className={th} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {stocks.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center normal-case text-gaia-700/60">
                <span className="t stk-date">Aucun produit ne correspond à ce filtre.</span>
              </td>
            </tr>
          )}
          {stocks.map((p) => (
            <tr
              key={p.code}
              onClick={() => onSelect?.(p)}
              className="stk-row cursor-pointer text-center"
            >
              <td className="py-3 text-left">
                <button type="button" aria-label={`Ouvrir la fiche ${p.nom}`} className="block text-left uppercase">
                  <p className="t stk-code">{p.code}</p>
                  <p className="t stk-name mt-0.5">{p.nom}</p>
                  <p className="t stk-supplier mt-0.5">{p.fournisseur}</p>
                </button>
              </td>
              <td>
                <p>
                  <span className="t stk-qty">{p.qte}</span>{' '}
                  <span className="t stk-qty-unit">{p.unite}</span>
                </p>
                <p className="t stk-seuil text-accent">Seuil {p.seuil}</p>
              </td>
              <td>
                <span className="t stk-price">{p.prix === null ? '—' : fmtMoney(p.prix)}</span>{' '}
                <span className="t stk-price-unit">xaf</span>
              </td>
              <td><span className="t stk-date">{fmtDate(p.livraison)}</span></td>
              <td>
                <span className={`t stk-status inline-block rounded-full px-3 py-0.5 ${PAIEMENT[p.paiement].tone}`}>{PAIEMENT[p.paiement].label}</span>
                {p.recu !== 'recu' && (
                  <span className={`t stk-status ml-1.5 inline-block rounded-full px-3 py-0.5 ${RECEPTION[p.recu].tone}`}>{RECEPTION[p.recu].label}</span>
                )}
              </td>
              <td className="w-10">
                <button
                  type="button"
                  aria-label={`Actions ${p.nom}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1"
                >
                  <Ellipsis size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
