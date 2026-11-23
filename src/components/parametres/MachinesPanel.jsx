import { useState } from 'react'
import { api } from '../../api/client.js'
import { useApi } from '../../hooks/useApi.js'
import { fmtDate, fmtMoney, fmtTime } from '../../lib/format.js'
import { Field, NumberInput } from '../wizard/Fields.jsx'
import MachineForm from './MachineForm.jsx'

// Réglage de la lecture automatique : à quelle fréquence on lit la machine, et à quelle fréquence on garde un relevé
function Lecture() {
  const { data, error, reload } = useApi('/parametres')
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ ok: false, texte: '' })
  if (!data) return error ? <p className="t ps-note text-danger">{error.message}</p> : null

  const { limites } = data
  const v = edit ?? { intervalle: String(data.lecture.intervalle), releve: String(data.lecture.releveMinutes) }
  const i = Number(v.intervalle)
  const r = Number(v.releve)
  const errIntervalle = !(i >= limites.intervalle[0] && i <= limites.intervalle[1]) ? `Entre ${limites.intervalle[0]} et ${limites.intervalle[1]} secondes` : null
  const errReleve = !(r >= limites.releve[0] && r <= limites.releve[1]) ? `Entre ${limites.releve[0]} et ${limites.releve[1]} minutes` : null

  const save = async (e) => {
    e.preventDefault()
    if (errIntervalle || errReleve || busy) return
    setBusy(true)
    setMessage({ ok: false, texte: '' })
    try {
      await api('/parametres/lecture', { method: 'PATCH', body: { intervalle: i, releveMinutes: r } })
      setEdit(null)
      reload()
      setMessage({ ok: true, texte: 'Enregistré : la lecture s’adapte dès le prochain tour.' })
    } catch (err) {
      setMessage({ ok: false, texte: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Lecture automatique" className="ps-card rounded-3xl bg-white">
      <h3 className="t ps-card-title">Lecture automatique</h3>
      <p className="t ps-note">Les machines reliées au réseau sont lues toutes seules, en lecture seule : l'application leur demande leurs compteurs, elle ne les modifie jamais.</p>
      <form onSubmit={save} noValidate className="ps-form ps-form-narrow">
        <div className="ps-grid">
          <Field label="Intervalle de lecture" error={errIntervalle}>
            <NumberInput value={v.intervalle} onChange={(x) => setEdit({ ...v, intervalle: x })} invalid={!!errIntervalle} suffix="secondes" maxLength={4} aria-label="Intervalle de lecture" />
          </Field>
          <Field label="Un relevé enregistré au plus toutes les" error={errReleve}>
            <NumberInput value={v.releve} onChange={(x) => setEdit({ ...v, releve: x })} invalid={!!errReleve} suffix="minutes" maxLength={4} aria-label="Fréquence des relevés" />
          </Field>
        </div>
        <p className="t ps-note">La page Rapport se met à jour à chaque lecture. Un relevé (gardé dans l'historique) n'est enregistré que si les compteurs ont changé.</p>
        <div className="ps-actions flex flex-wrap items-center gap-4">
          <button type="submit" disabled={!!errIntervalle || !!errReleve || busy} className="t ps-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
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

// Machines : la liste, « + Ajouter une machine », et l'historique des remises à zéro des compteurs
export default function MachinesPanel() {
  const { data, error, reload } = useApi('/parametres/machines', { keepPrevious: true })
  const [form, setForm] = useState(null) // null = fermé · 'nouvelle' · la machine à modifier

  return (
    <div className="ps-stack">
      <Lecture />

      <section aria-label="Machines" className="ps-card rounded-3xl bg-white">
        <div className="ps-bar flex flex-wrap items-center justify-between">
          <h3 className="t ps-card-title">Machines</h3>
          <button type="button" onClick={() => setForm('nouvelle')} className="t ps-btn rounded-full bg-gaia-700 text-white">
            + Ajouter une machine
          </button>
        </div>
        {!data ? (
          error ? <p className="t ps-note text-danger">{error.message}</p> : <p className="t ps-note">Chargement…</p>
        ) : (
          <ul className="ps-list">
            {data.machines.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setForm(m)} className="ps-row w-full text-left" data-off={!m.actif}>
                  <div className="min-w-0">
                    <p className="t ps-name">
                      {m.nom}
                      {!m.actif && <span className="ps-off">Retirée</span>}
                    </p>
                    <p className="t ps-sub">
                      {m.modele ?? 'Modèle non renseigné'}
                      {m.numeroSerie ? ` · série ${m.numeroSerie}` : ''}
                    </p>
                  </div>
                  <p className="t ps-sub ps-conn">
                    {m.protocole === 'snmp' ? (
                      <>
                        <span className="ps-dot" data-on={m.enLigne === null ? 'none' : m.enLigne} aria-hidden="true" /> Réseau · {m.adresse}
                      </>
                    ) : (
                      'Saisie à la main'
                    )}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Historique des remises à zéro" className="ps-card rounded-3xl bg-white">
        <h3 className="t ps-card-title">Historique des remises à zéro</h3>
        <p className="t ps-note">Chaque fois que les compteurs de la page Rapport ont été remis à zéro, avec le total de la machine à ce moment-là. (La remise se fait depuis la page Rapport.)</p>
        {data && data.remises.length === 0 && <p className="t ps-note">Aucune remise à zéro pour le moment.</p>}
        {data && data.remises.length > 0 && (
          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead>
                <tr>
                  <th className="t ps-th">Date</th>
                  <th className="t ps-th">Machine</th>
                  <th className="t ps-th">Faite par</th>
                  <th className="t ps-th ps-num">Total de la machine à ce moment</th>
                </tr>
              </thead>
              <tbody>
                {data.remises.map((r) => (
                  <tr key={r.id}>
                    <td className="t ps-td">
                      {fmtDate(r.le)} <span className="ps-time">{fmtTime(r.le)}</span>
                    </td>
                    <td className="t ps-td">{r.machine}</td>
                    <td className="t ps-td">{r.par ?? '—'}</td>
                    <td className="t ps-td ps-num">{r.total === null ? '—' : `${fmtMoney(r.total)} impressions`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && <MachineForm machine={form === 'nouvelle' ? null : form} onClose={() => setForm(null)} onSaved={reload} />}
    </div>
  )
}
