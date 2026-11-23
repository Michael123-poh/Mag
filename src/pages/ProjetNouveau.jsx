import './clientNouveau.css'
import './prestationNouveau.css'
import './projetNouveau.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useWizard } from '../hooks/useWizard.js'
import { fmtMoney } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import DoneScreen from '../components/wizard/DoneScreen.jsx'
import { ChipGroup, Field, MultiChipGroup, NumberInput, TextArea, TextInput } from '../components/wizard/Fields.jsx'
import WizardStepper from '../components/wizard/WizardStepper.jsx'
import ClientPicker from '../components/prestations/ClientPicker.jsx'
import ServiceSpec from '../components/projets/ServiceSpec.jsx'
import { checkStep, emptyProjet, labelOf, newLine, splitEvenly, sumOf, toBody, totalOf } from '../components/projets/newProjet.js'

const PARTS = 4 // 1. client + nom · 2. services · 3. prix · 4. dates

function Total({ total, invalid }) {
  return (
    <div data-invalid={invalid} className="pn-total nc-full flex items-center justify-between">
      <span className="t pn-total-label">Total du projet</span>
      <span className="t pn-total-value">{fmtMoney(total)} xaf</span>
    </div>
  )
}

export default function ProjetNouveau() {
  const navigate = useNavigate()
  const { data: options, error: optionsError, reload } = useApi('/projets/options')
  const { step, view, setView, locked, tried, setTried, attachForm, swap, shakeInvalid, fieldsProps } = useWizard()
  const [v, setV] = useState(emptyProjet)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState('')

  if (!options || optionsError) return <PageStatus loading={!optionsError} error={optionsError} onRetry={reload} />

  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))
  const errors = tried ? checkStep(view, v) : {}
  const total = totalOf(v)
  const carte = options.services.filter((s) => s.aLaCarte)
  const bouquet = options.bouquets.find((b) => b.code === v.bouquet)

  // Composition : changer de mode ou de bouquet repart d'une liste de services propre
  const setMode = (mode) => setV((prev) => (prev.mode === mode ? prev : { ...prev, mode, bouquet: '', bouquetPrix: 0, lignes: [] }))
  const setBouquet = (code) =>
    setV((prev) => ({
      ...prev,
      bouquet: code,
      bouquetPrix: options.bouquets.find((b) => b.code === code).prix,
      lignes: options.bouquets.find((b) => b.code === code).lignes.map((l) => newLine(l, l)),
    }))
  // À la carte : on coche / décoche les services (la ligne d'un service décoché disparaît, les autres gardent ce qui est déjà précisé)
  const setCarte = (codes) =>
    setV((prev) => ({
      ...prev,
      lignes: carte.filter((s) => codes.includes(s.code)).map((s) => prev.lignes.find((l) => l.service === s.code) ?? newLine(s)),
    }))
  const setLine = (line) => setV((prev) => ({ ...prev, lignes: prev.lignes.map((l) => (l.service === line.service ? line : l)) }))

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
      const res = await api('/projets', { method: 'POST', body: toBody(v) })
      setDone(res.reference)
      setView('done')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="nc-page pn-page pjn-page">
      <header>
        <h2 className="t nc-title">Nouveau Projet</h2>
        <p className="t nc-subtitle">Des services, un prix, un projet</p>
      </header>

      {view === 'done' ? (
        <DoneScreen message={`Projet enregistré${done ? ` · ${done}` : ''}`} buttonLabel="Retour aux projets" onButton={() => navigate('/projets')} />
      ) : (
        <form ref={attachForm} onSubmit={submit} noValidate className="nc-form mx-auto flex flex-col items-center">
          <div {...fieldsProps}>
            {view === 1 && (
              <div className="nc-grid grid">
                <Field label="Client" error={errors.client} className="nc-full">
                  <ClientPicker path="/projets/clients" value={v.client} onChange={set('client')} invalid={!!errors.client} />
                </Field>
                <Field label="Nom du projet" error={errors.titre} className="nc-full">
                  <TextInput value={v.titre} onChange={set('titre')} invalid={!!errors.titre} maxLength={200} aria-label="Nom du projet" />
                </Field>
              </div>
            )}

            {view === 2 && (
              <div className="nc-grid grid">
                <Field label="Composition du projet" error={errors.mode} className="nc-full">
                  <ChipGroup
                    label="Composition"
                    value={v.mode}
                    onChange={setMode}
                    options={[
                      { value: 'bouquet', label: 'Choisir un bouquet' },
                      { value: 'carte', label: 'Construire à la carte' },
                    ]}
                    invalid={!!errors.mode}
                  />
                </Field>

                {v.mode === 'bouquet' && (
                  <Field label="Bouquet" error={errors.bouquet} className="nc-full">
                    <ChipGroup label="Bouquet" value={v.bouquet} onChange={setBouquet} options={options.bouquets.map((b) => ({ value: b.code, label: `${b.nom} · ${fmtMoney(b.prix)} xaf` }))} invalid={!!errors.bouquet} />
                  </Field>
                )}

                {v.mode === 'carte' && (
                  <Field label="Services" error={errors.services} className="nc-full">
                    <MultiChipGroup
                      label="Services"
                      value={v.lignes.map((l) => l.service)}
                      onChange={setCarte}
                      options={carte.map((s) => ({ value: s.code, label: s.libelle }))}
                      invalid={!!errors.services}
                    />
                  </Field>
                )}

                {v.lignes.length > 0 && (
                  <div className="nc-full">
                    <p className="t pjn-hint">{v.mode === 'bouquet' ? `Le bouquet ${bouquet?.nom} (${fmtMoney(bouquet?.prix)} xaf) contient :` : 'À préciser pour chaque service :'}</p>
                    <ul className="pjn-specs">
                      {v.lignes.map((l) => (
                        <ServiceSpec key={l.service} line={l} templates={options.templates} reseaux={options.reseaux} onChange={setLine} invalid={!!errors[`spec:${l.service}`]} />
                      ))}
                    </ul>
                    {Object.keys(errors).some((k) => k.startsWith('spec:')) && <span className="t nc-error">Précisez les services marqués en rouge</span>}
                  </div>
                )}
              </div>
            )}

            {view === 3 && (
              <div className="nc-grid grid">
                <p className="t pjn-hint nc-full">
                  {v.mode === 'bouquet'
                    ? `Répartissez les ${fmtMoney(v.bouquetPrix)} xaf du bouquet ${bouquet?.nom} entre ses services : chaque paiement se validera service par service.`
                    : 'Le prix de chaque service ; le total du projet se calcule tout seul.'}
                </p>
                {v.mode === 'bouquet' && (
                  <button type="button" onClick={() => setV((prev) => ({ ...prev, lignes: splitEvenly(prev) }))} className="t pjn-split nc-full self-start text-gaia-700">
                    Répartir également
                  </button>
                )}
                {v.lignes.map((l) => (
                  <div key={l.service} className="pjn-price nc-full flex items-center justify-between gap-4">
                    <p className="t pn-line-name min-w-0">{labelOf(l)}</p>
                    <div className="pjn-price-input shrink-0">
                      <NumberInput
                        value={l.prix}
                        onChange={(prix) => setLine({ ...l, prix })}
                        invalid={!!errors[`prix:${l.service}`]}
                        suffix="xaf"
                        maxLength={9}
                        aria-label={`Prix — ${l.libelle}`}
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(errors).some((k) => k.startsWith('prix:')) && <span className="t nc-error nc-full">Indiquez le prix de chaque service (0 si offert)</span>}
                {v.mode === 'bouquet' && (
                  <p className="t pjn-hint nc-full">
                    Réparti : {fmtMoney(sumOf(v))} / {fmtMoney(v.bouquetPrix)} xaf
                  </p>
                )}
                {errors.repartition && <span className="t nc-error nc-full">{errors.repartition}</span>}
                <Total total={total} invalid={!!errors.repartition} />
              </div>
            )}

            {view === 4 && (
              <div className="nc-grid grid">
                <Field label="Début" error={errors.debut}>
                  <TextInput type="date" value={v.debut} onChange={set('debut')} invalid={!!errors.debut} aria-label="Début" />
                </Field>
                <Field label="Fin" error={errors.fin}>
                  <TextInput type="date" value={v.fin} onChange={set('fin')} invalid={!!errors.fin} aria-label="Fin" />
                </Field>
                <Field label="Description" className="nc-full">
                  <TextArea value={v.notes} onChange={set('notes')} maxLength={2000} aria-label="Description" />
                </Field>
                <ul className="pn-recap nc-full">
                  {v.lignes.map((l) => (
                    <li key={l.service} className="pn-line flex items-center justify-between gap-4">
                      <p className="t pn-line-name min-w-0">{labelOf(l)}</p>
                      <span className="t pn-line-total">{fmtMoney(l.prix)} xaf</span>
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
            <button type="button" onClick={() => (view === 1 ? navigate('/projets') : go(view - 1))} className="t nc-back">
              ← Retour
            </button>
          )}
        </form>
      )}
    </div>
  )
}
