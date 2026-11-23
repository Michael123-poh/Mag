import './clientNouveau.css'
import './prestationNouveau.css'
import './stockNouveau.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useWizard } from '../hooks/useWizard.js'
import { fmtMoney } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import DoneScreen from '../components/wizard/DoneScreen.jsx'
import { ChipGroup, Field, NumberInput, SelectInput, TextInput } from '../components/wizard/Fields.jsx'
import WizardStepper from '../components/wizard/WizardStepper.jsx'
import ProductPicker from '../components/stock/ProductPicker.jsx'
import { PAIEMENTS, RECEPTIONS, checkStep, emptyEntree, recueOf, toBody, totalOf } from '../components/stock/newEntree.js'

const PARTS = 3 // 1. produit · 2. réception (la marchandise) · 3. paiement (l'argent)

function Total({ total }) {
  return (
    <div className="pn-total nc-full flex items-center justify-between">
      <span className="t pn-total-label">Total</span>
      <span className="t pn-total-value">{fmtMoney(total)} xaf</span>
    </div>
  )
}

const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? '—'

export default function StockNouveau() {
  const navigate = useNavigate()
  const { data: options, error: optionsError, reload } = useApi('/stock/options')
  const { step, view, setView, locked, tried, setTried, attachForm, swap, shakeInvalid, fieldsProps } = useWizard()
  const [v, setV] = useState(emptyEntree)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState('')

  if (!options || optionsError) return <PageStatus loading={!optionsError} error={optionsError} onRetry={reload} />

  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))
  const errors = tried ? checkStep(view, v) : {}
  const unite = v.produit?.unite ?? ''
  const total = totalOf(v)
  const comptes = options.comptes.map((c) => ({ value: c.code, label: c.libelle }))

  // Le produit choisi propose son fournisseur habituel et son dernier prix (modifiables)
  const pickProduit = (produit) =>
    setV((prev) => ({
      ...prev,
      produit,
      fournisseur: produit?.fournisseurId ? String(produit.fournisseurId) : prev.fournisseur,
      prix: produit && !prev.prix && produit.prix ? String(produit.prix) : prev.prix,
    }))

  const go = (to) => {
    setServerError('')
    swap(to)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (locked || sending) return
    setTried(true)

    if (Object.keys(checkStep(view, v)).length > 0) {
      shakeInvalid()
      return
    }
    if (view < PARTS) {
      go(view + 1)
      return
    }

    setSending(true)
    setServerError('')
    try {
      const res = await api('/stock', { method: 'POST', body: toBody(v) })
      setDone(res.code)
      setView('done')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="nc-page pn-page sn-page">
      <header>
        <h2 className="t nc-title">Entrée de Stock</h2>
        <p className="t nc-subtitle">Une nouvelle livraison, un stock à jour</p>
      </header>

      {view === 'done' ? (
        <DoneScreen message={`Entrée enregistrée${done ? ` · ${done}` : ''}`} buttonLabel="Retour au stock" onButton={() => navigate('/stock')} />
      ) : (
        <form ref={attachForm} onSubmit={submit} noValidate className="nc-form mx-auto flex flex-col items-center">
          <div {...fieldsProps}>
            {view === 1 && (
              <div className="nc-grid grid">
                <Field label="Produit" error={errors.produit} className="nc-full">
                  <ProductPicker produits={options.produits} value={v.produit} onChange={pickProduit} invalid={!!errors.produit} />
                </Field>
                <Field label="Fournisseur" error={errors.fournisseur} className="nc-full">
                  <SelectInput
                    value={v.fournisseur}
                    onChange={set('fournisseur')}
                    options={options.fournisseurs.map((f) => ({ value: String(f.id), label: f.nom }))}
                    invalid={!!errors.fournisseur}
                    label="Fournisseur"
                  />
                </Field>
                <Field label={`Quantité commandée${unite ? ` (${unite})` : ''}`} error={errors.quantite}>
                  <NumberInput value={v.quantite} onChange={set('quantite')} invalid={!!errors.quantite} maxLength={7} aria-label="Quantité commandée" />
                </Field>
                <Field label="Prix unitaire" error={errors.prix}>
                  <NumberInput value={v.prix} onChange={set('prix')} invalid={!!errors.prix} suffix="xaf" maxLength={9} aria-label="Prix unitaire" />
                </Field>
                <Total total={total} />
              </div>
            )}

            {view === 2 && (
              <div className="nc-grid grid">
                <Field label="Réception de la marchandise" error={errors.reception} className="nc-full">
                  <ChipGroup label="Réception" value={v.reception} onChange={set('reception')} options={RECEPTIONS} invalid={!!errors.reception} />
                </Field>
                {v.reception === 'partiel' && (
                  <Field label={`Quantité reçue (${unite})`} error={errors.recue} className="nc-full">
                    <NumberInput value={v.recue} onChange={set('recue')} invalid={!!errors.recue} maxLength={7} aria-label="Quantité reçue" />
                  </Field>
                )}
                <Field label={v.reception === 'non_recu' ? 'Date de livraison prévue' : 'Date de livraison'} error={errors.date} className="nc-full">
                  <TextInput type="date" value={v.date} onChange={set('date')} invalid={!!errors.date} aria-label="Date de livraison" />
                </Field>
                <p className="t sn-hint nc-full">
                  {v.reception === 'non_recu'
                    ? 'Rien n’entre dans le stock tant que la marchandise n’est pas reçue.'
                    : v.reception === 'partiel'
                      ? 'Seule la quantité reçue entre dans le stock.'
                      : 'La quantité commandée entre dans le stock.'}
                </p>
              </div>
            )}

            {view === 3 && (
              <div className="nc-grid grid">
                <Field label="Paiement" error={errors.paiement} className="nc-full">
                  <ChipGroup label="Paiement" value={v.paiement} onChange={set('paiement')} options={PAIEMENTS} invalid={!!errors.paiement} />
                </Field>
                {v.paiement === 'acompte' && (
                  <Field label="Somme versée" error={errors.verse} className="nc-full">
                    <NumberInput value={v.verse} onChange={set('verse')} invalid={!!errors.verse} suffix="xaf" maxLength={10} aria-label="Somme versée" />
                  </Field>
                )}
                {(v.paiement === 'paye' || v.paiement === 'acompte') && (
                  <Field label="Payé depuis le compte" error={errors.compte} className="nc-full">
                    <ChipGroup label="Compte" value={v.compte} onChange={set('compte')} options={comptes} invalid={!!errors.compte} />
                  </Field>
                )}
                <p className="t sn-hint nc-full">
                  {v.paiement === 'paye'
                    ? 'La somme sort du compte choisi (décaissement rattaché à cette commande).'
                    : v.paiement === 'acompte'
                      ? 'Seule la somme versée sort du compte ; le reste se règle plus tard depuis la fiche du produit.'
                      : 'Aucune somme ne sort : l’achat restera à payer (à régler depuis la fiche du produit).'}
                </p>

                <ul className="pn-recap nc-full">
                  <li className="pn-line flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="t pn-line-name">{v.produit?.nom}</p>
                      <p className="t pn-line-sub">
                        {fmtMoney(v.quantite)} {unite} × {fmtMoney(v.prix)} xaf
                      </p>
                    </div>
                    <span className="t pn-line-total">{fmtMoney(total)} xaf</span>
                  </li>
                  <li className="pn-line flex items-center justify-between gap-4">
                    <p className="t pn-line-name">Paiement</p>
                    <span className="t pn-line-total">
                      {labelOf(PAIEMENTS, v.paiement)}
                      {v.paiement === 'acompte' ? ` · ${fmtMoney(v.verse)} xaf` : ''}
                    </span>
                  </li>
                  <li className="pn-line flex items-center justify-between gap-4">
                    <p className="t pn-line-name">Réception</p>
                    <span className="t pn-line-total">
                      {labelOf(RECEPTIONS, v.reception)}
                      {v.reception !== 'non_recu' ? ` · ${fmtMoney(recueOf(v))} ${unite}` : ''}
                    </span>
                  </li>
                </ul>
                <Total total={total} />
              </div>
            )}
          </div>

          <WizardStepper count={PARTS} step={step} />

          {serverError && (
            <p role="alert" className="t nc-error nc-server-error">
              {serverError}
            </p>
          )}

          <button type="submit" disabled={locked || sending} className="t nc-button rounded-full bg-gaia-700 text-white disabled:opacity-60">
            {view < PARTS ? 'Suivant' : sending ? 'Enregistrement…' : 'Valider'}
          </button>

          {!locked && (
            <button type="button" onClick={() => (view === 1 ? navigate('/stock') : go(view - 1))} className="t nc-back">
              ← Retour
            </button>
          )}
        </form>
      )}
    </div>
  )
}
