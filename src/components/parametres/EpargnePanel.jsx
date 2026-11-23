import { useState } from 'react'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { Field, NumberInput } from '../wizard/Fields.jsx'

// Épargne : le pourcentage du bénéfice du mois mis de côté (affiché sur la page Caisse) et l'objectif mensuel.
export default function EpargnePanel() {
  const { data, error, reload } = useApi('/parametres')
  const [edit, setEdit] = useState(null) // valeurs en cours de saisie (null = celles enregistrées)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ ok: false, texte: '' })
  if (!data) return error ? <p className="t ps-note text-danger">{error.message}</p> : <p className="t ps-note">Chargement…</p>

  const v = edit ?? { taux: String(data.epargne.taux), objectif: String(data.epargne.objectif) }
  const taux = Number(v.taux.replace(',', '.'))
  const invalide = v.taux === '' || !(taux >= 0 && taux <= 100)

  const save = async (e) => {
    e.preventDefault()
    if (invalide || busy) return
    setBusy(true)
    setMessage({ ok: false, texte: '' })
    try {
      await api('/parametres/epargne', { method: 'PATCH', body: { taux, objectif: Number(v.objectif) || 0 } })
      setEdit(null)
      reload()
      setMessage({ ok: true, texte: 'Enregistré : la page Caisse utilise ces valeurs dès maintenant.' })
    } catch (err) {
      setMessage({ ok: false, texte: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Épargne" className="ps-card rounded-3xl bg-white">
      <h3 className="t ps-card-title">Épargne du mois</h3>
      <p className="t ps-note">Chaque mois, ce pourcentage du bénéfice est mis de côté. Il apparaît dans la carte « Épargné ce mois » de la page Caisse.</p>

      <form onSubmit={save} noValidate className="ps-form ps-form-narrow">
        <div className="ps-grid">
          <Field label="Taux d'épargne" error={invalide && v.taux !== '' ? 'Entre 0 et 100 %' : null}>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={v.taux}
                onChange={(e) => setEdit({ ...v, taux: e.target.value.replace(/[^\d.,]/g, '').slice(0, 6) })}
                data-invalid={invalide}
                className="t nc-input nc-field w-full outline-none"
                aria-label="Taux d'épargne"
              />
              <span className="nc-unit pointer-events-none absolute top-1/2 -translate-y-1/2">
                <span className="t nc-unit-text">%</span>
              </span>
            </div>
          </Field>
          <Field label="Objectif mensuel">
            <NumberInput value={v.objectif} onChange={(objectif) => setEdit({ ...v, objectif })} suffix="xaf" maxLength={10} aria-label="Objectif mensuel" />
          </Field>
        </div>
        <div className="ps-actions flex flex-wrap items-center gap-4">
          <button type="submit" disabled={invalide || busy} className="t ps-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {message.texte && (
            <p role={message.ok ? 'status' : 'alert'} className={`t ps-note ${message.ok ? 'ps-ok' : 'text-danger'}`}>
              {message.texte}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
