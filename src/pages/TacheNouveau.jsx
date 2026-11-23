import './clientNouveau.css'
import './prestationNouveau.css'
import './tacheNouveau.css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useWizard } from '../hooks/useWizard.js'
import { fmtDateLong } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import DoneScreen from '../components/wizard/DoneScreen.jsx'
import { Field, SelectInput, TextInput } from '../components/wizard/Fields.jsx'
import WizardStepper from '../components/wizard/WizardStepper.jsx'
import SubtaskList from '../components/projets/SubtaskList.jsx'
import { checkStep, emptyTache, toBody, withDraft } from '../components/projets/newTache.js'

const PARTS = 3 // 1. nom + employé · 2. sous-tâches · 3. date et heures

export default function TacheNouveau() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projectUrl = `/projets/${encodeURIComponent(id)}`
  const { data: options, error: optionsError, reload } = useApi(`/projets/${encodeURIComponent(id)}/taches/options`)
  const { step, view, setView, locked, tried, setTried, attachForm, swap, shakeInvalid, fieldsProps } = useWizard()
  const [v, setV] = useState(emptyTache)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)

  if (!options || optionsError) return <PageStatus loading={!optionsError} error={optionsError} onRetry={reload} />

  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))
  const errors = tried ? checkStep(view, v) : {}
  const employe = options.employes.find((e) => String(e.id) === v.assignee)

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
      // une sous-tâche tapée mais pas encore ajoutée n'est pas perdue
      if (view === 2) setV(withDraft)
      go(view + 1)
      return
    }

    setSending(true)
    setServerError('')
    try {
      await api(`/projets/${encodeURIComponent(id)}/taches`, { method: 'POST', body: toBody(v) })
      setDone(true)
      setView('done')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="nc-page pn-page tn-page">
      <header>
        <h2 className="t nc-title">Nouvelle Tâche</h2>
        <p className="t nc-subtitle">{options.projet.titre}</p>
      </header>

      {view === 'done' ? (
        <DoneScreen message={done ? 'Tâche enregistrée' : ''} buttonLabel="Retour au projet" onButton={() => navigate(projectUrl)} />
      ) : (
        <form ref={attachForm} onSubmit={submit} noValidate className="nc-form mx-auto flex flex-col items-center">
          <div {...fieldsProps}>
            {view === 1 && (
              <div className="nc-grid grid">
                <Field label="Nom de la tâche" error={errors.titre} className="nc-full">
                  <TextInput value={v.titre} onChange={set('titre')} invalid={!!errors.titre} maxLength={200} aria-label="Nom de la tâche" />
                </Field>
                <Field label="Employé assigné" error={errors.assignee} className="nc-full">
                  <SelectInput
                    value={v.assignee}
                    onChange={set('assignee')}
                    options={options.employes.map((e) => ({ value: String(e.id), label: e.nom }))}
                    invalid={!!errors.assignee}
                    label="Employé assigné"
                  />
                </Field>
              </div>
            )}

            {view === 2 && (
              <div className="nc-grid grid">
                <Field label="Sous-tâches (facultatif)" className="nc-full">
                  <SubtaskList notes={v.notes} draft={v.draft} onNotes={set('notes')} onDraft={set('draft')} />
                </Field>
                {v.notes.length === 0 && <p className="t tn-hint nc-full">S’il n’y en a pas, passez directement à la suite.</p>}
              </div>
            )}

            {view === 3 && (
              <div className="nc-grid grid">
                <Field label="Date d'exécution" error={errors.date} className="nc-full">
                  <TextInput type="date" value={v.date} onChange={set('date')} invalid={!!errors.date} aria-label="Date d'exécution" />
                </Field>
                <Field label="Heure de début" error={errors.debut}>
                  <TextInput type="time" value={v.debut} onChange={set('debut')} invalid={!!errors.debut} aria-label="Heure de début" />
                </Field>
                <Field label="Heure de fin" error={errors.fin}>
                  <TextInput type="time" value={v.fin} onChange={set('fin')} invalid={!!errors.fin} aria-label="Heure de fin" />
                </Field>

                <ul className="pn-recap nc-full">
                  <li className="pn-line">
                    <p className="t pn-line-name">{v.titre.trim()}</p>
                    <p className="t pn-line-sub">
                      {employe?.nom ?? '—'}
                      {v.notes.length ? ` · ${v.notes.length} sous-tâche${v.notes.length > 1 ? 's' : ''}` : ''}
                      {v.date ? ` · ${fmtDateLong(v.date)}` : ''}
                    </p>
                  </li>
                </ul>
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
            <button type="button" onClick={() => (view === 1 ? navigate(projectUrl) : go(view - 1))} className="t nc-back">
              ← Retour
            </button>
          )}
        </form>
      )}
    </div>
  )
}
