import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { fmtDate, fmtDay, fmtMoney } from '../../lib/format.js'
import OrderList from './OrderList.jsx'

function InfoCard({ title, value, unit, footer }) {
  return (
    <div className="stk-sheet-card flex flex-col justify-between rounded-2xl bg-surface p-4">
      <div>
        <p className="t stk-sheet-card-title text-gaia-700/70">{title}</p>
        <p className="mt-2">
          <span className="t stk-sheet-card-value">{value}</span>{' '}
          <span className="t stk-sheet-card-unit">{unit}</span>
        </p>
      </div>
      <p className="t stk-sheet-card-foot mt-4 text-gaia-700/70">{footer}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="stk-sheet-section">
      <h3 className="t stk-sheet-title">{title}</h3>
      {children}
    </section>
  )
}

// Fiche produit : une fenêtre plus haute que large, ouverte au clic sur une ligne du stock.
//   ids       : identifiants des produits de la liste, dans l'ordre affiché (flèches ← → du clavier : produit précédent / suivant)
//   onOpen    : appelé avec l'identifiant du produit voulu quand on change avec les flèches
//   onChanged : appelé quand une commande est régularisée (la liste du stock se met à jour)
export default function ProductSheet({ produit, ids = [], onOpen, onClose, onChanged }) {
  const closeRef = useRef(null)

  // Flèche gauche / droite : produit précédent / suivant de la liste (on s'arrête aux extrémités).
  // Sans effet quand on tape dans un champ (somme versée, quantité reçue).
  const index = ids.indexOf(produit.id)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        const next = ids[index + (e.key === 'ArrowLeft' ? -1 : 1)]
        if (next === undefined || !onOpen) return
        e.preventDefault()
        onOpen(next)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onOpen, ids, index])

  // Sans livraison enregistrée, la fiche affiche seulement la quantité actuelle
  const d = produit.detail ?? {
    arrivee: { qte: 0, date: null },
    actuelle: { qte: produit.qte, du: null, au: null },
    machines: [],
    prixAchat: 0,
    reglement: { type: 'Solde', montant: 0 },
    duree: null,
    statuts: null,
  }
  const reception = d.statuts?.reception

  return createPortal(
    <div
      className="stk-sheet fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="stk-sheet-name"
        className="stk-sheet-panel relative flex w-full flex-col rounded-3xl bg-white p-7 shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Fermer la fiche"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gaia-900"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <header className="stk-sheet-head flex items-start justify-between pr-6">
          <div>
            <h2 id="stk-sheet-name" className="t stk-sheet-name">
              {produit.nom}
            </h2>
            <p className="t stk-sheet-supplier text-gaia-700/70">{produit.fournisseur}</p>
          </div>
          <p className="t stk-sheet-code text-gaia-700/70">{produit.code}</p>
        </header>

        <div className="stk-sheet-cards grid grid-cols-2">
          <InfoCard
            title="Quantité arrivée"
            value={d.arrivee.qte}
            unit={produit.unite}
            footer={reception?.code === 'non_recu' ? `Livraison prévue le ${fmtDate(d.arrivee.date)}` : `Arrivée le ${fmtDate(d.arrivee.date)}`}
          />
          <InfoCard
            title="Quantité actuelle"
            value={d.actuelle.qte}
            unit={produit.unite}
            footer={d.actuelle.du ? `(du ${fmtDay(d.actuelle.du)} - ${fmtDay(d.actuelle.au)})` : 'Aucune livraison reçue'}
          />
        </div>

        {/* Chaque commande avec ses deux statuts (marchandise reçue · argent versé) et de quoi régulariser */}
        <Section title="Commandes">
          <OrderList key={produit.id} produitId={produit.id} onChanged={onChanged} />
        </Section>

        <Section title="Machines concernées">
          {d.machines.length ? (
            <ul className="stk-sheet-machines flex flex-wrap">
              {d.machines.map((m) => (
                <li key={m} className="t stk-sheet-machine">
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="t stk-sheet-machine">-- --</p>
          )}
        </Section>

        <Section title="Prix d'achat">
          <p>
            <span className="t stk-sheet-amount">{fmtMoney(d.prixAchat)}</span>{' '}
            <span className="t stk-sheet-amount-unit">xaf</span>
          </p>
        </Section>

        <Section title={d.reglement.type}>
          <p>
            <span className="t stk-sheet-amount">{fmtMoney(d.reglement.montant)}</span>{' '}
            <span className="t stk-sheet-amount-unit">xaf</span>
          </p>
        </Section>

        <p className="t stk-sheet-avg mt-auto pt-6 text-gaia-700/60">Durée moyenne : {d.duree ? `${d.duree} jours` : '—'}</p>
      </article>
    </div>,
    document.body,
  )
}
