import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { fmtDate, fmtMoney } from '../../lib/format.js'

const STATUTS = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'Encours' },
  { value: 'livre', label: 'Livré' },
]

const PAIEMENT = { payee: 'Payé', partielle: 'Acompte versé', impayee: 'Non payé', non_facture: 'Non facturé' }
const COMPTES = [
  { code: 'caisse', label: 'Caisse' },
  { code: 'banque', label: 'Banque' },
  { code: 'mobile', label: 'Mobile' },
]

function InfoCard({ title, value, unit, footer }) {
  return (
    <div className="pr-sheet-card flex flex-col justify-between rounded-2xl bg-surface p-4">
      <div>
        <p className="t pr-sheet-card-title text-gaia-700/70">{title}</p>
        <p className="mt-2">
          <span className="t pr-sheet-card-value">{value}</span> {unit && <span className="t pr-sheet-card-unit">{unit}</span>}
        </p>
      </div>
      <p className="t pr-sheet-card-foot mt-4 text-gaia-700/70">{footer}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="pr-sheet-section">
      <h3 className="t pr-sheet-title">{title}</h3>
      {children}
    </section>
  )
}

// Fiche d'une prestation : fenêtre ouverte au clic sur une ligne de la liste.
//   id        : prestation à afficher
//   ids       : identifiants des prestations de la liste, dans l'ordre affiché (flèches ← → du clavier : prestation précédente / suivante)
//   onOpen    : appelé avec l'identifiant de la prestation voulue quand on change avec les flèches
//   onClose   : fermeture
//   onChanged : appelé après un changement de statut (la liste se recharge)
export default function PrestationSheet({ id, ids = [], onOpen, onClose, onChanged }) {
  const { data: p, error, reload } = useApi(`/prestations/${id}`, { keepPrevious: true }) // la fiche reste affichée le temps que la suivante arrive
  const stale = !!p && p.id !== id // fiche précédente encore affichée : on n'agit pas dessus
  const closeRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirming, setConfirming] = useState(false) // clic sur « Livré » : attend la confirmation (c'est définitif)
  const [payForm, setPayForm] = useState(false) // formulaire « Encaisser » ouvert
  const [payValue, setPayValue] = useState('')
  const [payCompte, setPayCompte] = useState('')
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')
  const [payDetail, setPayDetail] = useState(false) // liste des versements déployée

  // Flèche gauche / droite : prestation précédente / suivante de la liste (on s'arrête aux extrémités)
  const index = ids.indexOf(id)
  const go = (delta) => {
    const next = ids[index + delta]
    if (next === undefined || !onOpen) return
    setConfirming(false)
    setSaveError('')
    setPayForm(false)
    setPayDetail(false)
    onOpen(next)
  }

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        e.preventDefault()
        go(e.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, id, ids, onOpen])

  const pickStatut = (statut) => {
    if (saving || locked || stale || statut === p.statut) return
    setSaveError('')
    if (statut === 'livre') setConfirming(true)
    else changeStatut(statut)
  }

  const changeStatut = async (statut) => {
    setConfirming(false)
    setSaving(true)
    setSaveError('')
    try {
      await api(`/prestations/${id}/statut`, { method: 'PATCH', body: { statut } })
      reload()
      onChanged()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Paiement : le prix de la prestation (ou celui de sa facture), ce qui est déjà encaissé et ce qui reste
  const prix = p ? (p.facture?.total ?? p.tarif) : 0
  const encaisse = p?.facture?.encaisse ?? 0
  const reste = Math.max(0, prix - encaisse)

  const openPay = () => {
    if (stale) return
    setPayForm(true)
    setPayValue(String(reste))
    setPayCompte('')
    setPayError('')
  }

  const submitPay = async (e) => {
    e.preventDefault()
    if (stale) return
    const n = Number(payValue)
    if (!(n >= 1) || n > reste) return setPayError(`Entre 1 et ${fmtMoney(reste)} xaf`)
    if (!payCompte) return setPayError('Choisissez le compte à créditer')
    setPayBusy(true)
    setPayError('')
    try {
      await api(`/prestations/${id}/paiement`, { method: 'POST', body: { montant: n, compte: payCompte } })
      setPayForm(false)
      reload()
      onChanged()
    } catch (err) {
      setPayError(err.message)
    } finally {
      setPayBusy(false)
    }
  }

  const total = p?.lignes.reduce((n, l) => n + l.total, 0) ?? 0
  const locked = p?.statut === 'livre' // une prestation livrée ne change plus de statut

  return createPortal(
    <div
      className="pr-sheet fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-sheet-name"
        className="pr-sheet-panel relative flex w-full flex-col rounded-3xl bg-white p-7 shadow-2xl"
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

        {!p && (
          <p className="t pr-sheet-muted py-16 text-center">{error ? (error.status === 404 ? 'Prestation introuvable.' : error.message) : 'Chargement…'}</p>
        )}

        {p && (
          <>
            <header className="pr-sheet-head flex items-start justify-between gap-4 pr-6">
              <div className="min-w-0">
                <h2 id="pr-sheet-name" className="t pr-sheet-name">
                  {p.titre}
                </h2>
                <p className="t pr-sheet-client text-gaia-700/70">
                  {p.client.nom}
                  {p.client.telephone ? ` · ${p.client.telephone}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="t pr-sheet-code text-gaia-700/70">{p.reference}</p>
                <p className="t pr-sheet-code text-gaia-700/70">{p.service}</p>
              </div>
            </header>

            <Section title="Statut de production">
              <div role="radiogroup" aria-label="Statut de production" className="pr-sheet-statuts flex">
                {STATUTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={p.statut === s.value}
                    data-statut={s.value}
                    disabled={saving || (locked && s.value !== 'livre')}
                    onClick={() => pickStatut(s.value)}
                    className="pr-sheet-statut"
                  >
                    <span className="t pr-sheet-statut-text">{s.label}</span>
                  </button>
                ))}
              </div>
              {locked && <p className="t pr-sheet-muted">Prestation livrée : le statut ne peut plus être modifié.</p>}
              {confirming && (
                <div role="alertdialog" aria-label="Confirmer la livraison" className="pr-sheet-confirm flex items-center justify-between gap-4">
                  <p className="t pr-sheet-confirm-text">Marquer comme livrée ? C'est définitif.</p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setConfirming(false)} className="t pr-sheet-confirm-btn text-gaia-700/70">
                      Annuler
                    </button>
                    <button type="button" onClick={() => changeStatut('livre')} className="t pr-sheet-confirm-btn rounded-full bg-gaia-700 px-5 py-1 text-white">
                      Confirmer
                    </button>
                  </div>
                </div>
              )}
              {saveError && (
                <p role="alert" className="t pr-sheet-error">
                  {saveError}
                </p>
              )}
            </Section>

            <div className="pr-sheet-cards grid grid-cols-2">
              <InfoCard
                title="Prix total"
                value={fmtMoney(p.tarif)}
                unit="xaf"
                footer={PAIEMENT[p.paiement]}
              />
              <InfoCard
                title="Échéance"
                value={fmtDate(p.echeance)}
                footer={p.livraison ? `Livré le ${fmtDate(p.livraison)}` : `Créée le ${fmtDate(p.cree)}`}
              />
            </div>

            {/* Encaisser : le client paie au comptoir, acompte ou solde ; la somme crédite le compte choisi */}
            <Section title="Paiement">
              <div className="pr-pay flex items-center justify-between gap-4">
                <p className="t pr-pay-line">
                  {fmtMoney(encaisse)} / {fmtMoney(prix)} xaf
                  {reste > 0 && encaisse > 0 ? <span className="pr-pay-rest"> · reste {fmtMoney(reste)}</span> : ''}
                </p>
                <p className="t pr-pay-status">{PAIEMENT[p.paiement]}</p>
              </div>

              {payForm ? (
                <form onSubmit={submitPay} className="pr-pay-form">
                  <p className="t pr-pay-label">Somme encaissée (reste {fmtMoney(reste)} xaf)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="Somme encaissée"
                      value={payValue ? Number(payValue).toLocaleString('fr-FR') : ''}
                      onChange={(e) => setPayValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="t pr-pay-input min-w-0 flex-1 rounded-xl bg-surface outline-none"
                    />
                    <button type="submit" disabled={payBusy} className="t pr-pay-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
                      {payBusy ? '…' : 'Encaisser'}
                    </button>
                    <button type="button" onClick={() => setPayForm(false)} className="t pr-pay-btn text-gaia-700">
                      Annuler
                    </button>
                  </div>
                  <div role="radiogroup" aria-label="Compte à créditer" className="flex flex-wrap gap-2">
                    {COMPTES.map((k) => (
                      <button key={k.code} type="button" role="radio" aria-checked={payCompte === k.code} onClick={() => setPayCompte(k.code)} className="pr-pay-chip">
                        <span className="t pr-pay-btn">{k.label}</span>
                      </button>
                    ))}
                  </div>
                  {payError && (
                    <p role="alert" className="t pr-sheet-error">
                      {payError}
                    </p>
                  )}
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={reste <= 0 || prix <= 0}
                    title={reste <= 0 ? 'Cette prestation est entièrement payée' : undefined}
                    onClick={openPay}
                    className="t pr-pay-btn rounded-full bg-gaia-700 text-white"
                  >
                    Encaisser un paiement
                  </button>
                  {p.versements.length > 0 && (
                    <button type="button" aria-expanded={payDetail} onClick={() => setPayDetail((o) => !o)} className="t pr-pay-btn ml-auto flex items-center gap-1 text-gaia-700">
                      Détail <ChevronDown size={16} strokeWidth={2.6} className={payDetail ? 'rotate-180' : ''} />
                    </button>
                  )}
                </div>
              )}

              {payDetail && (
                <div className="pr-pay-detail">
                  {p.versements.map((v) => (
                    <div key={v.id}>
                      <p className="t pr-pay-meta">
                        {fmtDate(v.date)} · {fmtMoney(v.montant)} xaf · {v.compte}
                        {v.par ? ` · ${v.par}` : ''}
                      </p>
                      {v.libelle && <p className="t pr-pay-meta text-gaia-700/60">{v.libelle}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Détail de la prestation">
              {p.lignes.length > 0 ? (
                <>
                  <ul className="pr-sheet-lines">
                    {p.lignes.map((l, i) => (
                      <li key={i} className="pr-sheet-line flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="t pr-sheet-line-name">{l.libelle}</p>
                          <p className="t pr-sheet-line-sub text-gaia-700/70">
                            {fmtMoney(l.quantite)} × {fmtMoney(l.prix)} xaf
                          </p>
                        </div>
                        <span className="t pr-sheet-line-total">{fmtMoney(l.total)} xaf</span>
                      </li>
                    ))}
                  </ul>
                  {total !== p.tarif && <p className="t pr-sheet-muted">Le total de la prestation ({fmtMoney(p.tarif)} xaf) a été fixé séparément des lignes ci-dessus.</p>}
                </>
              ) : (
                <p className="t pr-sheet-muted">Aucun détail ligne par ligne enregistré pour cette prestation.</p>
              )}
            </Section>

            {p.notes && (
              <Section title="Informations diverses">
                <p className="t pr-sheet-notes">{p.notes}</p>
              </Section>
            )}

            <p className="t pr-sheet-foot mt-auto pt-6 text-gaia-700/60">Responsable : {p.responsable ?? '—'}</p>
          </>
        )}
      </article>
    </div>,
    document.body,
  )
}
