import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { fmtDate, fmtMoney } from '../../lib/format.js'
import { PAIEMENT } from '../stock/statuts.js'

const COMPTES = [
  { code: 'caisse', label: 'Caisse' },
  { code: 'banque', label: 'Banque' },
  { code: 'mobile', label: 'Mobile' },
]

// Un service du projet : son prix, ce qui est déjà payé, et de quoi valider un paiement.
// Valider un paiement = un encaissement qui crédite le compte choisi (Caisse, Banque ou Mobile).
function ServiceCard({ s, projetId, onChanged }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(false)
  const [value, setValue] = useState('')
  const [compte, setCompte] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const badge = PAIEMENT[s.statut]

  const openForm = () => {
    setForm(true)
    setValue(String(s.reste))
    setCompte('')
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const n = Number(value)
    if (!(n >= 1) || n > s.reste) return setError(`Entre 1 et ${fmtMoney(s.reste)} xaf`)
    if (!compte) return setError('Choisissez le compte à créditer')
    setBusy(true)
    setError('')
    try {
      await api(`/projets/${projetId}/services/${s.id}/paiement`, { method: 'POST', body: { montant: n, compte } })
      setForm(false)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="pd-pay-card rounded-2xl bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t pd-pay-name">{s.libelle}</p>
          {s.bouquet && <p className="t pd-pay-meta text-gaia-700/70">Bouquet {s.bouquet}</p>}
        </div>
        <span className={`t pd-pay-pill shrink-0 rounded-full px-3 py-0.5 ${badge.tone}`}>{badge.label}</span>
      </div>
      <p className="t pd-pay-meta">
        {fmtMoney(s.paye)} / {fmtMoney(s.prix)} xaf
        {s.reste > 0 && s.paye > 0 ? ` · reste ${fmtMoney(s.reste)}` : ''}
      </p>

      {form ? (
        <form onSubmit={submit} className="pd-pay-form">
          <p className="t pd-pay-label">Somme encaissée (reste {fmtMoney(s.reste)} xaf)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Somme encaissée"
              value={value ? Number(value).toLocaleString('fr-FR') : ''}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="t pd-pay-input min-w-0 flex-1 rounded-xl bg-white outline-none"
            />
            <button type="submit" disabled={busy} className="t pd-pay-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
              {busy ? '…' : 'Valider'}
            </button>
            <button type="button" onClick={() => setForm(false)} className="t pd-pay-btn text-gaia-700">
              Annuler
            </button>
          </div>
          <div role="radiogroup" aria-label="Compte à créditer" className="flex flex-wrap gap-2">
            {COMPTES.map((k) => (
              <button key={k.code} type="button" role="radio" aria-checked={compte === k.code} onClick={() => setCompte(k.code)} className="pd-pay-chip">
                <span className="t pd-pay-btn">{k.label}</span>
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="t pd-pay-error">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={s.reste <= 0} onClick={openForm} title={s.reste <= 0 ? 'Ce service est entièrement payé' : undefined} className="t pd-pay-btn rounded-full bg-gaia-700 text-white">
            Valider le paiement
          </button>
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="t pd-pay-btn ml-auto flex items-center gap-1 text-gaia-700">
            Détail <ChevronDown size={16} strokeWidth={2.6} className={open ? 'rotate-180' : ''} />
          </button>
        </div>
      )}

      {open && (
        <div className="pd-pay-detail">
          {s.versements.length === 0 && <p className="t pd-pay-meta text-gaia-700/60">Aucun paiement encaissé</p>}
          {s.versements.map((x) => (
            <div key={x.id}>
              <p className="t pd-pay-meta">
                {fmtDate(x.date)} · {fmtMoney(x.montant)} xaf · {x.compte}
                {x.par ? ` · ${x.par}` : ''}
              </p>
              {x.libelle && <p className="t pd-pay-meta text-gaia-700/60">{x.libelle}</p>}
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

// Fenêtre « Gestion des paiements » d'un projet : les paiements à valider service par service, et l'historique des encaissements.
//   projetId : projet concerné · onClose : ferme la fenêtre
export default function PaymentsSheet({ projetId, onClose }) {
  const navigate = useNavigate()
  const closeRef = useRef(null)
  const [tab, setTab] = useState('valider') // 'valider' | 'historique'
  const { data, error, reload } = useApi(`/projets/${projetId}/paiements`, { keepPrevious: true })

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="pd-sheet pd-pay fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article role="dialog" aria-modal="true" aria-labelledby="pd-pay-title" className="pd-sheet-panel relative flex w-full flex-col rounded-3xl bg-white p-7 shadow-2xl">
        <button ref={closeRef} type="button" aria-label="Fermer" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-gaia-900">
          <X size={16} strokeWidth={2.5} />
        </button>

        <header className="pr-6">
          <h2 id="pd-pay-title" className="t pd-sheet-name">
            Gestion des paiements
          </h2>
          {data && (
            <p className="t pd-sheet-sub text-gaia-700/70">
              {data.projet.reference} · {data.projet.client}
            </p>
          )}
        </header>

        {error && !data && <p className="t pd-pay-error">{error.message}</p>}
        {!data && !error && <p className="t pd-pay-meta text-gaia-700/60">Chargement…</p>}

        {data && (
          <>
            <div className="pd-pay-totals grid grid-cols-3">
              {[
                ['Total', data.total],
                ['Encaissé', data.paye],
                ['Reste', data.reste],
              ].map(([label, n]) => (
                <div key={label} className="rounded-2xl bg-surface p-3">
                  <p className="t pd-pay-meta text-gaia-700/70">{label}</p>
                  <p>
                    <span className="t pd-pay-total">{fmtMoney(n)}</span> <span className="t pd-pay-meta">xaf</span>
                  </p>
                </div>
              ))}
            </div>

            <div role="tablist" className="flex gap-2">
              {[
                ['valider', 'Paiements à valider'],
                ['historique', 'Historique'],
              ].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="pd-pay-tab">
                  <span className="t pd-pay-btn">{label}</span>
                </button>
              ))}
            </div>

            {tab === 'valider' &&
              (data.services.length === 0 ? (
                <p className="t pd-pay-meta text-gaia-700/60">Aucun service enregistré pour ce projet (projet créé avant la gestion par services).</p>
              ) : (
                <ul className="pd-pay-list flex flex-col">
                  {data.services.map((s) => (
                    <ServiceCard key={s.id} s={s} projetId={projetId} onChanged={reload} />
                  ))}
                </ul>
              ))}

            {tab === 'historique' && (
              <>
                {data.historique.length === 0 && <p className="t pd-pay-meta text-gaia-700/60">Aucun paiement encaissé pour le moment.</p>}
                <ul className="pd-pay-list flex flex-col">
                  {data.historique.map((h) => (
                    <li key={h.id} className="pd-pay-hist flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="t pd-pay-name">{h.service}</p>
                        <p className="t pd-pay-meta text-gaia-700/70">
                          {fmtDate(h.date)} · {h.compte}
                          {h.par ? ` · ${h.par}` : ''}
                        </p>
                      </div>
                      <p className="t pd-pay-name shrink-0">+ {fmtMoney(h.montant)} xaf</p>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => navigate('/caisse/historique')} className="t pd-pay-btn self-start text-gaia-700 underline">
                  Voir l'historique de toute la caisse
                </button>
              </>
            )}
          </>
        )}
      </article>
    </div>,
    document.body,
  )
}
