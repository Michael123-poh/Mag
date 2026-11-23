import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { fmtDate, fmtMoney } from '../../lib/format.js'
import { PAIEMENT, RECEPTION } from './statuts.js'

const COMPTES = [
  { code: 'caisse', label: 'Caisse' },
  { code: 'banque', label: 'Banque' },
  { code: 'mobile', label: 'Mobile' },
]

const Pill = ({ badge }) => <span className={`t stk-status inline-block rounded-full px-3 py-0.5 ${badge.tone}`}>{badge.label}</span>

// Une commande : son numéro, ses deux statuts, ce qui reste à recevoir / à payer, et de quoi régulariser.
//   La marchandise reçue et l'argent versé sont rattachés à CETTE commande (même numéro) : impossible de les mélanger avec une autre.
function OrderCard({ c, unite, onChanged }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(null) // 'reception' | 'versement' : formulaire de régularisation ouvert
  const [value, setValue] = useState('')
  const [compte, setCompte] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const resteQte = Math.round((c.quantite - c.recue) * 100) / 100
  const resteMontant = c.total - c.paye

  const openForm = (m) => {
    setMode(m)
    setValue(String(m === 'reception' ? resteQte : resteMontant))
    setCompte('')
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const n = Number(value)
    const max = mode === 'reception' ? resteQte : resteMontant
    if (!(n >= 1) || n > max) return setError(`Entre 1 et ${fmtMoney(max)}`)
    if (mode === 'versement' && !compte) return setError('Choisissez le compte qui paie')
    setBusy(true)
    setError('')
    try {
      await api(`/stock/commandes/${c.id}/${mode}`, { method: 'POST', body: mode === 'reception' ? { quantite: n } : { montant: n, compte } })
      setMode(null)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="stk-ord rounded-2xl bg-surface">
      <div className="flex items-baseline justify-between gap-3">
        <p className="t stk-ord-ref">
          {c.ref} <span className="stk-ord-date">· {fmtDate(c.date)}</span>
        </p>
        <p className="t stk-ord-meta truncate text-gaia-700/70">{c.fournisseur}</p>
      </div>

      <div className="stk-ord-line flex items-center justify-between">
        <p className="t stk-ord-label">
          Marchandise <span className="stk-ord-value">{c.recue} / {c.quantite} {unite}</span>
        </p>
        <Pill badge={RECEPTION[c.reception]} />
      </div>
      <div className="stk-ord-line flex items-center justify-between">
        <p className="t stk-ord-label">
          Paiement <span className="stk-ord-value">{fmtMoney(c.paye)} / {fmtMoney(c.total)} xaf</span>
        </p>
        <Pill badge={PAIEMENT[c.paiement]} />
      </div>

      {mode ? (
        <form onSubmit={submit} className="stk-ord-form">
          <p className="t stk-ord-label">{mode === 'reception' ? `Quantité reçue (reste ${fmtMoney(resteQte)} ${unite})` : `Somme versée (reste ${fmtMoney(resteMontant)} xaf)`}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              aria-label={mode === 'reception' ? 'Quantité reçue' : 'Somme versée'}
              value={value ? Number(value).toLocaleString('fr-FR') : ''}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="t stk-ord-input min-w-0 flex-1 rounded-xl bg-white outline-none"
            />
            <button type="submit" disabled={busy} className="t stk-ord-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
              {busy ? '…' : 'Valider'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="t stk-ord-btn text-gaia-700">
              Annuler
            </button>
          </div>
          {mode === 'versement' && (
            <div role="radiogroup" aria-label="Compte" className="flex flex-wrap gap-2">
              {COMPTES.map((k) => (
                <button key={k.code} type="button" role="radio" aria-checked={compte === k.code} onClick={() => setCompte(k.code)} className="stk-ord-chip">
                  <span className="t stk-ord-btn">{k.label}</span>
                </button>
              ))}
            </div>
          )}
          {error && <p role="alert" className="t stk-ord-error">{error}</p>}
        </form>
      ) : (
        <div className="stk-ord-actions flex flex-wrap items-center gap-2">
          {resteQte > 0 && (
            <button type="button" onClick={() => openForm('reception')} className="t stk-ord-btn rounded-full bg-gaia-700 text-white">
              Réceptionner
            </button>
          )}
          {resteMontant > 0 && (
            <button type="button" onClick={() => openForm('versement')} className="t stk-ord-btn rounded-full bg-gaia-700 text-white">
              Verser
            </button>
          )}
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="t stk-ord-btn ml-auto flex items-center gap-1 text-gaia-700">
            Détail <ChevronDown size={16} strokeWidth={2.6} className={open ? 'rotate-180' : ''} />
          </button>
        </div>
      )}

      {open && (
        <div className="stk-ord-detail">
          <p className="t stk-ord-label">Arrivées de marchandise</p>
          {c.arrivees.length === 0 && <p className="t stk-ord-hist text-gaia-700/60">Aucune arrivée</p>}
          {c.arrivees.map((a) => (
            <p key={a.id} className="t stk-ord-hist">
              {fmtDate(a.date)} · +{a.qte} {unite}
              {a.par ? ` · ${a.par}` : ''}
            </p>
          ))}
          <p className="t stk-ord-label stk-ord-gap">Versements</p>
          {c.versements.length === 0 && <p className="t stk-ord-hist text-gaia-700/60">Aucun versement</p>}
          {c.versements.map((x) => (
            <div key={x.id}>
              <p className="t stk-ord-hist">
                {fmtDate(x.date)} · {fmtMoney(x.montant)} xaf · {x.compte}
                {x.par ? ` · ${x.par}` : ''}
              </p>
              {x.libelle && <p className="t stk-ord-hist text-gaia-700/60">{x.libelle}</p>}
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

// Toutes les commandes d'un produit, de la plus récente à la plus ancienne.
//   onChanged : appelé après une régularisation (la liste du stock se met à jour)
export default function OrderList({ produitId, onChanged }) {
  const { data, error, reload } = useApi(`/stock/${produitId}/commandes`, { keepPrevious: true })
  if (error) return <p className="t stk-ord-hist text-danger">{error.message}</p>
  if (!data) return <p className="t stk-ord-hist text-gaia-700/60">Chargement…</p>
  if (data.commandes.length === 0) return <p className="t stk-ord-hist text-gaia-700/60">Aucune commande enregistrée</p>

  return (
    <ul className="stk-ord-list flex flex-col">
      {data.commandes.map((c) => (
        <OrderCard
          key={c.id}
          c={c}
          unite={data.unite}
          onChanged={() => {
            reload()
            onChanged()
          }}
        />
      ))}
    </ul>
  )
}
