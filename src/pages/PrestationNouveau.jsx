import './clientNouveau.css'
import './prestationNouveau.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useWizard } from '../hooks/useWizard.js'
import { fmtMoney } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import DoneScreen from '../components/wizard/DoneScreen.jsx'
import { ChipGroup, Field, NumberInput, TextArea, TextInput } from '../components/wizard/Fields.jsx'
import WizardStepper from '../components/wizard/WizardStepper.jsx'
import ClientPicker from '../components/prestations/ClientPicker.jsx'
import LineBuilder from '../components/prestations/LineBuilder.jsx'
import { checkStep, emptyPrestation, linesOf, toBody, totalOf } from '../components/prestations/newPrestation.js'

const PARTS = 3 // 1. client + service · 2. détail du service · 3. livraison

const asOptions = (list) => list.map((x) => ({ value: x, label: x }))

function Total({ total }) {
  return (
    <div className="pn-total nc-full flex items-center justify-between">
      <span className="t pn-total-label">Total</span>
      <span className="t pn-total-value">{fmtMoney(total)} xaf</span>
    </div>
  )
}

export default function PrestationNouveau() {
  const navigate = useNavigate()
  const { data: options, error: optionsError, reload } = useApi('/prestations/options')
  const { step, view, setView, locked, tried, setTried, attachForm, swap, shakeInvalid, fieldsProps } = useWizard()
  const [v, setV] = useState(emptyPrestation)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState('')

  if (!options || optionsError) return <PageStatus loading={!optionsError} error={optionsError} onRetry={reload} />

  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))
  const errors = tried ? checkStep(view, v) : {}
  const { photocopie } = options
  const lines = linesOf(v, photocopie.prix)
  const total = totalOf(lines)

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
      const res = await api('/prestations', { method: 'POST', body: toBody(v) })
      setDone(res.reference)
      setView('done')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="nc-page pn-page">
      <header>
        <h2 className="t nc-title">Nouvelle Prestation</h2>
        <p className="t nc-subtitle">Un nouveau bon, Une nouvelle commande</p>
      </header>

      {view === 'done' ? (
        <DoneScreen message={`Prestation enregistrée${done ? ` · ${done}` : ''}`} buttonLabel="Retour aux prestations" onButton={() => navigate('/prestations')} />
      ) : (
        <form ref={attachForm} onSubmit={submit} noValidate className="nc-form mx-auto flex flex-col items-center">
          <div {...fieldsProps}>
            {view === 1 && (
              <div className="nc-grid grid">
                <Field label="Client" error={errors.client} className="nc-full">
                  <ClientPicker value={v.client} onChange={set('client')} invalid={!!errors.client} />
                </Field>
                <Field label="Nom de la prestation" error={errors.titre} className="nc-full">
                  <TextInput value={v.titre} onChange={set('titre')} invalid={!!errors.titre} aria-label="Nom de la prestation" />
                </Field>
                <Field label="Service" error={errors.service} className="nc-full">
                  <ChipGroup label="Service" value={v.service} onChange={set('service')} options={options.services} invalid={!!errors.service} />
                </Field>
              </div>
            )}

            {view === 2 && v.service === 'photocopie' && (
              <div className="nc-grid grid">
                <Field label="Nombre de pages" error={errors.pages}>
                  <NumberInput value={v.pages} onChange={set('pages')} invalid={!!errors.pages} maxLength={7} aria-label="Nombre de pages" />
                </Field>
                <Field label="Prix de la page">
                  <div className="t nc-input nc-field nc-static flex items-center">{fmtMoney(photocopie.prix)} xaf</div>
                </Field>
                <Field label="Couleur" error={errors.couleur} className="nc-full">
                  <ChipGroup
                    label="Couleur"
                    value={v.couleur}
                    onChange={set('couleur')}
                    options={photocopie.couleurs.map((c) => ({ value: c, label: c === 'N/B' ? 'Noir et blanc (N/B)' : 'Quadri (couleur)' }))}
                    invalid={!!errors.couleur}
                  />
                </Field>
                <Field label="Format" error={errors.format}>
                  <ChipGroup label="Format" value={v.format} onChange={set('format')} options={asOptions(photocopie.formats)} invalid={!!errors.format} />
                </Field>
                <Field label="Tirage" error={errors.tirage}>
                  <ChipGroup label="Tirage" value={v.tirage} onChange={set('tirage')} options={asOptions(photocopie.tirages)} invalid={!!errors.tirage} />
                </Field>
                <Total total={total} />
              </div>
            )}

            {view === 2 && v.service === 'mise-en-page' && (
              <div className="nc-grid grid">
                <Field label="Nombre de pages" error={errors.pages}>
                  <NumberInput value={v.pages} onChange={set('pages')} invalid={!!errors.pages} maxLength={6} aria-label="Nombre de pages" />
                </Field>
                <Field label="Prix de la page" error={errors.prixPage}>
                  <NumberInput value={v.prixPage} onChange={set('prixPage')} invalid={!!errors.prixPage} suffix="xaf" maxLength={8} aria-label="Prix de la page" />
                </Field>
                <Total total={total} />
              </div>
            )}

            {view === 2 && v.service === 'impression' && (
              <LineBuilder tarifs={options.tarifs} lignes={v.lignes} onChange={set('lignes')} error={errors.lignes} />
            )}

            {view === 3 && (
              <div className="nc-grid grid">
                <Field label="Date de livraison" error={errors.date}>
                  <TextInput type="date" value={v.date} onChange={set('date')} invalid={!!errors.date} aria-label="Date de livraison" />
                </Field>
                <Field label="Informations diverses" className="nc-full">
                  <TextArea value={v.notes} onChange={set('notes')} maxLength={1000} aria-label="Informations diverses" />
                </Field>
                <ul className="pn-recap nc-full">
                  {lines.map((l, i) => (
                    <li key={i} className="pn-line flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="t pn-line-name">{l.label}</p>
                        <p className="t pn-line-sub">
                          {fmtMoney(l.quantite)} × {fmtMoney(l.prix)} xaf
                        </p>
                      </div>
                      <span className="t pn-line-total">{fmtMoney(l.total)} xaf</span>
                    </li>
                  ))}
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
            <button type="button" onClick={() => (view === 1 ? navigate('/prestations') : go(view - 1))} className="t nc-back">
              ← Retour
            </button>
          )}
        </form>
      )}
    </div>
  )
}
