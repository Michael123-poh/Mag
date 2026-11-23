import './rapport.css'
import { useEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { fmtMoney } from '../lib/format.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import PageShell from '../components/layout/PageShell.jsx'

const num = (n) => (n === null || n === undefined ? '—' : fmtMoney(n))
const asDate = (iso) => new Date(String(iso).replace(' ', 'T'))
const heure = (iso) => (iso ? asDate(iso).toLocaleTimeString('fr-FR') : '')
const jour = (iso) => (iso ? asDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

// Image d'une machine : le fichier placé dans public/machines/, sinon une imprimante dessinée
function MachineImage({ image, nom }) {
  const [broken, setBroken] = useState(false) // fichier introuvable : on retombe sur le dessin
  if (!image || broken) return <Printer className="rp-placeholder" strokeWidth={1.3} aria-hidden="true" />
  return <img src={`/machines/${image}`} alt={nom} onError={() => setBroken(true)} className="rp-img" />
}

// Un magasin se lit « Standard, Blanc et A4 (210 x 297 mm) » : type de papier, couleur, puis format et dimensions
const magasinText = (m) => {
  const papier = [m.type, m.couleur].filter(Boolean).join(', ')
  return [papier, m.dimension].filter(Boolean).join(' et ') || '—'
}

function Row({ label, value }) {
  return (
    <div className="rp-row flex items-baseline justify-between">
      <dt className="t rp-label">{label}</dt>
      <dd className="t rp-value text-right">{value || '—'}</dd>
    </div>
  )
}

// Un compteur : son nom et sa valeur (— si la machine ne l'a pas transmis)
function Stat({ label, value }) {
  return (
    <div className="rp-stat">
      <p className="t rp-stat-label">{label}</p>
      <p className="t rp-stat-value">{num(value)}</p>
    </div>
  )
}

// Ligne d'état de la lecture : en direct, injoignable, ou machine sans lecture réseau
function Etat({ machine: m, intervalle }) {
  if (!m.reseau) return <p className="t rp-note">Machine non reliée au réseau : valeurs saisies à la main.</p>
  if (m.enLigne === null) return <p className="t rp-note">Première lecture en cours…</p>
  if (m.enLigne) {
    return (
      <p className="t rp-note rp-live">
        <span className="rp-dot" data-on="true" aria-hidden="true" /> En direct · mis à jour à {heure(m.lectureLe)} (toutes les {intervalle} s)
      </p>
    )
  }
  return (
    <p className="t rp-note rp-live">
      <span className="rp-dot" data-on="false" aria-hidden="true" /> Machine injoignable{m.erreur ? ` (${m.erreur})` : ''}
      {m.lectureLe ? ` · dernières valeurs du ${jour(m.lectureLe)} à ${heure(m.lectureLe)}` : ''}
    </p>
  )
}

const TONERS = [
  ['K', 'Noir'],
  ['C', 'Cyan'],
  ['M', 'Magenta'],
  ['Y', 'Jaune'],
]

export default function Rapport() {
  const { data, error, reload } = useApi('/rapports/machines', { keepPrevious: true })
  const [selectedId, setSelectedId] = useState(null) // machine dont les informations sont affichées
  const [busy, setBusy] = useState(false) // « Relever maintenant » en cours
  const [actionError, setActionError] = useState('')
  const [totalMachine, setTotalMachine] = useState(false) // true : compteurs depuis la mise en service de la machine (sans la remise à zéro)
  const [confirmZero, setConfirmZero] = useState(false) // « Remettre à zéro » : attend la confirmation

  // Actualisation automatique : la page relit l'API à chaque intervalle (celui de la lecture de la machine)
  const reloadRef = useRef(reload)
  useEffect(() => {
    reloadRef.current = reload
  })
  const intervalle = data?.intervalle ?? 20
  useEffect(() => {
    const timer = setInterval(() => reloadRef.current(), intervalle * 1000)
    return () => clearInterval(timer)
  }, [intervalle])

  if (!data) return <PageStatus loading={!error} error={error} onRetry={reload} />

  const machine = data.machines.find((m) => m.id === selectedId)
  const c = machine && (totalMachine ? machine.compteursTotal : machine.compteurs) // depuis la remise à zéro, ou total de la machine

  const relever = async () => {
    setBusy(true)
    setActionError('')
    try {
      await api(`/rapports/machines/${machine.id}/releve`, { method: 'POST' })
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Remise à zéro : à partir des chiffres actuels de la machine (elle n'est pas modifiée ; le total reste consultable)
  const remettreAZero = async () => {
    setBusy(true)
    setActionError('')
    try {
      await api(`/rapports/machines/${machine.id}/remise-a-zero`, { method: 'POST' })
      setConfirmZero(false)
      setTotalMachine(false)
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <header>
        <h2 className="t rp-title">Rapport</h2>
        <p className="t rp-subtitle">Contrôle des machines</p>
      </header>

      {/* Les machines : 4 par rangée au maximum, le nom sous chaque image */}
      <ul className="rp-machines grid">
        {data.machines.map((m) => (
          <li key={m.id}>
            <button type="button" aria-pressed={m.id === selectedId} onClick={() => setSelectedId(m.id)} className="rp-machine flex w-full flex-col items-center">
              <span className="rp-machine-img relative flex items-center justify-center rounded-3xl bg-white">
                <MachineImage image={m.image} nom={m.nom} />
                {m.reseau && m.enLigne !== null && <span className="rp-dot rp-dot-corner" data-on={m.enLigne} title={m.enLigne ? 'En ligne' : 'Injoignable'} />}
              </span>
              <span className="t rp-machine-name">{m.nom}</span>
            </button>
          </li>
        ))}
        {data.machines.length === 0 && <li className="t rp-label col-span-full">Aucune machine enregistrée.</li>}
      </ul>

      {machine && (
        <div className="rp-details">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Etat machine={machine} intervalle={data.intervalle} />
            {machine.reseau && (
              <button type="button" onClick={relever} disabled={busy} className="t rp-now rounded-full bg-gaia-700 text-white">
                {busy ? 'Lecture…' : 'Relever maintenant'}
              </button>
            )}
          </div>
          {actionError && (
            <p role="alert" className="t rp-note text-danger">
              {actionError}
            </p>
          )}

          <div className="rp-top grid md:grid-cols-2">
            <section aria-label="Données utilisateur communes" className="rp-card rounded-3xl bg-white">
              <h3 className="t rp-card-title">Données utilisateur communes</h3>
              <dl className="rp-rows flex flex-col">
                <Row label="Nom de la machine" value={machine.nom} />
                <Row label="Adresse IP" value={machine.adresse} />
                <Row label="Numéro de série" value={machine.numeroSerie} />
                <Row label="Couleur du support par défaut" value={machine.couleurSupport} />
                <Row label="Mode d'impression par défaut" value={machine.modeImpression} />
              </dl>
              {machine.toners && (
                <div className="rp-toners">
                  <p className="t rp-label">Toners</p>
                  <div className="rp-toner-row flex">
                    {TONERS.map(([key, label]) => (
                      <div key={key} className="rp-toner" title={`${label} : ${machine.toners[key] ?? '—'} %`}>
                        <p className="t rp-toner-pct">{machine.toners[key] ?? '—'} %</p>
                        <div className="rp-toner-bar">
                          <span className="rp-toner-fill" data-color={key} style={{ height: `${machine.toners[key] ?? 0}%` }} />
                        </div>
                        <p className="t rp-toner-label">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section aria-label="Magasins" className="rp-card rounded-3xl bg-white">
              <h3 className="t rp-card-title">Magasins</h3>
              {machine.magasins.length === 0 ? (
                <p className="t rp-label">Aucun magasin enregistré.</p>
              ) : (
                <ul className="rp-rows flex flex-col">
                  {machine.magasins.map((m) => (
                    <li key={m.nom} className="rp-row flex items-baseline justify-between gap-4">
                      <span className="t rp-label">{m.nom}</span>
                      <span className="t rp-value text-right">
                        {magasinText(m)}
                        {m.niveau !== null && m.capacite !== null && (
                          <span className="rp-level">
                            {' '}
                            · {num(m.niveau)} / {num(m.capacite)} feuilles
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Compteurs en impressions : total, imprimé et copie pour toute la machine, puis petits formats / grands formats / total */}
          <section aria-label="Compteurs" className="rp-card rp-counters rounded-3xl bg-white">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="t rp-card-title">Compteurs</h3>
              <p className="t rp-note">En impressions (une feuille recto verso = 2 impressions)</p>
            </header>

            {/* Depuis quand on compte : la remise à zéro (chiffres de départ) ou la mise en service de la machine */}
            <div className="rp-since flex flex-wrap items-center">
              <p className="t rp-note rp-since-text">
                {machine.remise && !totalMachine
                  ? `Depuis la remise à zéro du ${jour(machine.remise.le)} à ${heure(machine.remise.le)}${machine.remise.par ? ` (${machine.remise.par})` : ''}`
                  : 'Total depuis la mise en service de la machine'}
              </p>
              {machine.remise && (
                <div role="radiogroup" aria-label="Période des compteurs" className="rp-chips flex">
                  {[
                    [false, 'Depuis la remise à zéro'],
                    [true, 'Total machine'],
                  ].map(([value, label]) => (
                    <button key={label} type="button" role="radio" aria-checked={totalMachine === value} onClick={() => setTotalMachine(value)} className="rp-chip">
                      <span className="t rp-chip-text">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              {machine.reseau && !confirmZero && (
                <button type="button" onClick={() => setConfirmZero(true)} className="t rp-zero rp-since-end">
                  Remettre à zéro
                </button>
              )}
            </div>
            {confirmZero && (
              <div role="alertdialog" aria-label="Confirmer la remise à zéro" className="rp-confirm flex flex-wrap items-center justify-between">
                <p className="t rp-confirm-text">Repartir de zéro à partir des chiffres actuels de la machine ? La machine n'est pas modifiée et son total reste consultable.</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setConfirmZero(false)} className="t rp-confirm-btn text-gaia-700">
                    Annuler
                  </button>
                  <button type="button" onClick={remettreAZero} disabled={busy} className="t rp-confirm-btn rounded-full bg-gaia-700 text-white">
                    {busy ? 'Lecture…' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}

            {!c ? (
              <p className="t rp-label rp-empty">Aucun relevé pour cette machine.</p>
            ) : (
              <>
                <div className="rp-groups flex flex-wrap">
                  <Stat label="Total" value={c.ensemble.impressions} />
                  <Stat label="Imprimé" value={c.imprime} />
                  <Stat label="Copie" value={c.copie} />
                </div>

                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th className="t rp-th" />
                        <th className="t rp-th rp-num">Petits formats (A4, A5)</th>
                        <th className="t rp-th rp-num">Grands formats (A3, SRA3)</th>
                        <th className="t rp-th rp-num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['impressions', 'Impressions'],
                        ['couleur', 'Couleur'],
                        ['nb', 'Noir et blanc'],
                        ['recto', 'Recto'],
                        ['rectoVerso', 'Recto verso'],
                      ].map(([key, label]) => (
                        <tr key={key}>
                          <th scope="row" className="t rp-td-label">
                            {label}
                          </th>
                          <td className="t rp-td rp-num">{num(c.petits[key])}</td>
                          <td className="t rp-td rp-num">{num(c.grands[key])}</td>
                          <td className="t rp-td rp-num rp-td-total">{num(c.ensemble[key])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </PageShell>
  )
}
