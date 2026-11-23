import './clientNouveau.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useWizard } from '../hooks/useWizard.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import DoneScreen from '../components/wizard/DoneScreen.jsx'
import { Field, NumberInput, SelectInput, TextInput } from '../components/wizard/Fields.jsx'
import WizardStepper from '../components/wizard/WizardStepper.jsx'
import PhoneField from '../components/clients/PhoneField.jsx'
import { checkActivite, checkContact, emptyClient, toBody } from '../components/clients/newClient.js'

const PARTS = 2 // nombre de parties du formulaire

export default function ClientNouveau() {
  const navigate = useNavigate()
  const { data: options, error: optionsError, reload } = useApi('/clients/options')
  const { step, view, setView, locked, tried, setTried, attachForm, swap, shakeInvalid, fieldsProps } = useWizard()
  const [v, setV] = useState(emptyClient)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [code, setCode] = useState('')

  if (!options || optionsError) return <PageStatus loading={!optionsError} error={optionsError} onRetry={reload} />

  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))
  const errors = tried ? (view === 1 ? checkContact(v) : checkActivite(v)) : {}

  const go = (to) => {
    setServerError('')
    swap(to)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (locked || sending) return
    setTried(true)

    const problems = view === 1 ? checkContact(v) : checkActivite(v)
    if (Object.keys(problems).length > 0) {
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
      const res = await api('/clients', { method: 'POST', body: toBody(v) })
      setCode(res.code)
      setView('done')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="nc-page">
      <header>
        <h2 className="t nc-title">Nouveau Partenaire</h2>
        <p className="t nc-subtitle">Un nouveau partenaire, Une nouvelle histoire</p>
      </header>

      {view === 'done' ? (
        <DoneScreen message={`Partenaire enregistré${code ? ` · ${code}` : ''}`} buttonLabel="Retour aux clients" onButton={() => navigate('/clients')} />
      ) : (
        <form ref={attachForm} onSubmit={submit} noValidate className="nc-form mx-auto flex flex-col items-center">
          <div {...fieldsProps}>
            {view === 1 ? (
              <div className="nc-grid grid">
                <Field label="Noms" error={errors.nom}>
                  <TextInput value={v.nom} onChange={set('nom')} invalid={!!errors.nom} autoComplete="organization" aria-label="Noms" />
                </Field>
                <Field label="Ville" error={errors.ville}>
                  <TextInput value={v.ville} onChange={set('ville')} invalid={!!errors.ville} autoComplete="address-level2" aria-label="Ville" />
                </Field>
                <Field label="Numéro" error={errors.numero} className="nc-full">
                  <PhoneField country={v.pays} number={v.numero} onCountry={set('pays')} onNumber={set('numero')} invalid={!!errors.numero} />
                </Field>
                <Field label="Email" error={errors.email} className="nc-full">
                  <TextInput
                    type="email"
                    value={v.email}
                    onChange={set('email')}
                    invalid={!!errors.email}
                    placeholder="@gmail.com"
                    autoComplete="email"
                    aria-label="Email"
                  />
                </Field>
              </div>
            ) : (
              <div className="nc-grid grid">
                <Field label="Forme Juridique" error={errors.forme}>
                  <SelectInput value={v.forme} onChange={set('forme')} options={options.formes} invalid={!!errors.forme} label="Forme juridique" />
                </Field>
                <Field label="Activité" error={errors.activite}>
                  <SelectInput value={v.activite} onChange={set('activite')} options={options.activites} invalid={!!errors.activite} label="Activité" />
                </Field>
                <Field label="Chiffre D'affaire" className="nc-full">
                  <NumberInput value={v.chiffre} onChange={set('chiffre')} suffix="xaf" maxLength={12} aria-label="Chiffre d'affaire" />
                </Field>
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
            <button type="button" onClick={() => (view === 1 ? navigate('/clients') : go(view - 1))} className="t nc-back">
              ← Retour
            </button>
          )}
        </form>
      )}
    </div>
  )
}
