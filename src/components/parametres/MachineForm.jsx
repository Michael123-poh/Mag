import { useState } from 'react'
import { api } from '../../api/client.js'
import { ChipGroup, Field, TextInput } from '../wizard/Fields.jsx'
import Popup from './Popup.jsx'

const vide = { nom: '', modele: '', protocole: 'snmp', adresse: '', numeroSerie: '', couleurSupport: '', modeImpression: '', image: '', actif: true }
const IP = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/

// Ajout ou modification d'une machine. Une machine « réseau » est lue toute seule ; une machine « manuelle » est saisie à la main.
//   machine : la machine à modifier (sans elle : ajout)
export default function MachineForm({ machine, onClose, onSaved }) {
  const edition = !!machine
  const [v, setV] = useState(
    edition ? { ...vide, nom: machine.nom, modele: machine.modele ?? '', protocole: machine.protocole === 'snmp' ? 'snmp' : 'manuel', adresse: machine.adresse ?? '', numeroSerie: machine.numeroSerie ?? '', couleurSupport: machine.couleurSupport ?? '', modeImpression: machine.modeImpression ?? '', image: machine.image ?? '', actif: machine.actif } : vide,
  )
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState(null) // résultat du test de connexion
  const [error, setError] = useState('')
  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))

  const errors = {}
  if (v.nom.trim().length < 2) errors.nom = 'Indiquez le nom'
  if (v.protocole === 'snmp' && !IP.test(v.adresse.trim())) errors.adresse = 'Adresse du réseau local (ex. 192.168.1.150)'
  if (v.image && !/^[\w.-]+$/.test(v.image)) errors.image = 'Nom de fichier seulement (ex. xerox7835.png)'

  // Lit le nom et le numéro de série de la machine (lecture seule) pour remplir le formulaire
  const tester = async () => {
    if (!IP.test(v.adresse.trim())) return setTried(true)
    setTesting(true)
    setTest(null)
    try {
      const r = await api('/parametres/machines/tester', { method: 'POST', body: { adresse: v.adresse.trim() } })
      setTest(r)
      if (r.ok) setV((prev) => ({ ...prev, nom: prev.nom || r.nom || '', modele: prev.modele || r.modele || '', numeroSerie: prev.numeroSerie || r.serie || '' }))
    } catch (err) {
      setTest({ ok: false, erreur: err.message })
    } finally {
      setTesting(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length > 0 || busy) return
    setBusy(true)
    setError('')
    const body = {
      nom: v.nom.trim(),
      modele: v.modele.trim() || undefined,
      protocole: v.protocole,
      adresse: v.protocole === 'snmp' ? v.adresse.trim() : undefined,
      numero_serie: v.numeroSerie.trim() || undefined,
      couleur_support: v.couleurSupport.trim() || undefined,
      mode_impression: v.modeImpression.trim() || undefined,
      image: v.image.trim() || undefined,
      actif: v.actif,
    }
    try {
      await api(edition ? `/parametres/machines/${machine.id}` : '/parametres/machines', { method: edition ? 'PATCH' : 'POST', body })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Popup titre={edition ? machine.nom : 'Ajouter une machine'} sousTitre={edition ? null : 'Elle apparaîtra sur la page Rapport.'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="ps-form">
        <Field label="Comment la machine est-elle suivie ?">
          <ChipGroup
            label="Suivi"
            value={v.protocole}
            onChange={set('protocole')}
            options={[
              { value: 'snmp', label: 'Sur le réseau (lecture automatique)' },
              { value: 'manuel', label: 'Saisie à la main' },
            ]}
          />
        </Field>

        {v.protocole === 'snmp' && (
          <div className="ps-group">
            <Field label="Adresse de la machine (IP)" error={tried && errors.adresse}>
              <div className="flex items-center gap-3">
                <TextInput value={v.adresse} onChange={set('adresse')} invalid={tried && !!errors.adresse} maxLength={40} aria-label="Adresse IP" placeholder="192.168.1.150" />
                <button type="button" onClick={tester} disabled={testing} className="t ps-btn shrink-0 rounded-full bg-gaia-700 text-white disabled:opacity-60">
                  {testing ? 'Test…' : 'Tester'}
                </button>
              </div>
            </Field>
            {test && (
              <p role="status" className={`t ps-note ${test.ok ? 'ps-ok' : 'text-danger'}`}>
                {test.ok ? `Machine trouvée : ${test.nom ?? 'sans nom'}${test.serie ? ` · série ${test.serie}` : ''} (${test.magasins} magasin${test.magasins > 1 ? 's' : ''}). Les champs vides ont été remplis.` : test.erreur}
              </p>
            )}
            <p className="t ps-note">L'adresse se trouve sur la machine (écran, ou page d'état imprimée). L'application ne fait que lire ses compteurs : elle ne la modifie jamais.</p>
          </div>
        )}

        <div className="ps-grid">
          <Field label="Nom de la machine" error={tried && errors.nom}>
            <TextInput value={v.nom} onChange={set('nom')} invalid={tried && !!errors.nom} maxLength={120} aria-label="Nom de la machine" />
          </Field>
          <Field label="Modèle">
            <TextInput value={v.modele} onChange={set('modele')} maxLength={120} aria-label="Modèle" />
          </Field>
          <Field label="Numéro de série">
            <TextInput value={v.numeroSerie} onChange={set('numeroSerie')} maxLength={60} aria-label="Numéro de série" />
          </Field>
          <Field label="Fichier de l'image" error={tried && errors.image}>
            <TextInput value={v.image} onChange={set('image')} invalid={tried && !!errors.image} maxLength={255} aria-label="Fichier de l'image" placeholder="xerox7835.png (dans public/machines)" />
          </Field>
          <Field label="Couleur du support par défaut">
            <TextInput value={v.couleurSupport} onChange={set('couleurSupport')} maxLength={60} aria-label="Couleur du support par défaut" placeholder="Blanc" />
          </Field>
          <Field label="Mode d'impression par défaut">
            <TextInput value={v.modeImpression} onChange={set('modeImpression')} maxLength={60} aria-label="Mode d'impression par défaut" placeholder="Recto/Verso" />
          </Field>
        </div>

        {edition && (
          <label className="ps-check">
            <input type="checkbox" checked={v.actif} onChange={(e) => set('actif')(e.target.checked)} />
            <span className="t ps-check-text">Machine active (décochez pour la retirer de la page Rapport)</span>
          </label>
        )}

        {error && (
          <p role="alert" className="t nc-error">
            {error}
          </p>
        )}
        <div className="ps-actions flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="t ps-btn text-gaia-700">
            Annuler
          </button>
          <button type="submit" disabled={busy} className="t ps-btn rounded-full bg-gaia-700 text-white disabled:opacity-60">
            {busy ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Ajouter la machine'}
          </button>
        </div>
      </form>
    </Popup>
  )
}
