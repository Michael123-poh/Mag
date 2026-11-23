import { useState } from 'react'
import { api } from '../../api/client.js'
import { Field, MultiChipGroup, NumberInput, TextArea, TextInput } from '../wizard/Fields.jsx'
import Popup from './Popup.jsx'

const vide = { nom: '', email: '', telephone: '', poste: '', fonction: '', salaire: '', dateEmbauche: '', motDePasse: '', actif: true, privileges: [] }

// Création ou modification d'un employé : identité, titre du poste, ce qu'il fait, salaire, privilèges.
//   employe : l'employé à modifier (sans lui : création) · postes : titres de poste déjà utilisés (suggestions)
//   privileges : tous les privilèges [{ code, libelle }] · moi : identifiant de la personne connectée
export default function EmployeForm({ employe, postes, privileges, moi, onClose, onSaved }) {
  const edition = !!employe
  const [v, setV] = useState(
    edition
      ? { ...vide, nom: employe.nom, email: employe.email, telephone: employe.telephone ?? '', poste: employe.poste, fonction: employe.fonction ?? '', salaire: employe.salaire == null ? '' : String(employe.salaire), dateEmbauche: employe.dateEmbauche ? String(employe.dateEmbauche).slice(0, 10) : '', actif: employe.actif, privileges: employe.privileges }
      : vide,
  )
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (value) => setV((prev) => ({ ...prev, [key]: value }))

  const errors = {}
  if (v.nom.trim().length < 2) errors.nom = 'Indiquez le nom'
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errors.email = 'Email invalide'
  if (v.poste.trim().length < 2) errors.poste = 'Indiquez le titre du poste'
  if (!edition && v.motDePasse.length < 8) errors.motDePasse = '8 caractères minimum'
  if (edition && v.motDePasse && v.motDePasse.length < 8) errors.motDePasse = '8 caractères minimum'

  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length > 0 || busy) return
    setBusy(true)
    setError('')
    const body = {
      nom: v.nom.trim(),
      email: v.email.trim(),
      telephone: v.telephone.trim() || undefined,
      poste: v.poste.trim(),
      fonction: v.fonction.trim() || undefined,
      salaire: v.salaire === '' ? null : Number(v.salaire),
      date_embauche: v.dateEmbauche || null,
      privileges: v.privileges,
    }
    if (v.motDePasse) body.mot_de_passe = v.motDePasse
    if (edition) body.actif = v.actif
    try {
      await api(edition ? `/parametres/employes/${employe.id}` : '/parametres/employes', { method: edition ? 'PATCH' : 'POST', body })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const soi = edition && employe.id === moi

  return (
    <Popup titre={edition ? employe.nom : 'Nouvel employé'} sousTitre={edition ? `${employe.matricule} · ${employe.poste}` : 'Il pourra se connecter avec son email et ce mot de passe.'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="ps-form">
        <div className="ps-grid">
          <Field label="Nom complet" error={tried && errors.nom} className="ps-full">
            <TextInput value={v.nom} onChange={set('nom')} invalid={tried && !!errors.nom} maxLength={120} aria-label="Nom complet" />
          </Field>
          <Field label="Email" error={tried && errors.email}>
            <TextInput type="email" value={v.email} onChange={set('email')} invalid={tried && !!errors.email} maxLength={160} aria-label="Email" />
          </Field>
          <Field label="Téléphone">
            <TextInput value={v.telephone} onChange={set('telephone')} maxLength={30} aria-label="Téléphone" />
          </Field>
          <Field label="Titre du poste" error={tried && errors.poste}>
            <TextInput value={v.poste} onChange={set('poste')} invalid={tried && !!errors.poste} maxLength={60} list="ps-postes" aria-label="Titre du poste" placeholder="Ex. Graphiste" />
            <datalist id="ps-postes">
              {postes.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Salaire mensuel">
            <NumberInput value={v.salaire} onChange={set('salaire')} suffix="xaf" maxLength={9} aria-label="Salaire mensuel" />
          </Field>
          <Field label="Ce qu'il fait (ses tâches)" className="ps-full">
            <TextArea value={v.fonction} onChange={set('fonction')} maxLength={255} aria-label="Ce qu'il fait" placeholder="Ex. Conçoit les logos et les chartes graphiques" />
          </Field>
          <Field label="Date d'embauche">
            <TextInput type="date" value={v.dateEmbauche} onChange={set('dateEmbauche')} aria-label="Date d'embauche" />
          </Field>
          <Field label={edition ? 'Nouveau mot de passe' : 'Mot de passe'} error={tried && errors.motDePasse}>
            <TextInput type="password" value={v.motDePasse} onChange={set('motDePasse')} invalid={tried && !!errors.motDePasse} maxLength={100} autoComplete="new-password" aria-label="Mot de passe" placeholder={edition ? 'Laisser vide pour ne pas changer' : ''} />
          </Field>
        </div>

        <div className="ps-group">
          <p className="t nc-label">Privilèges (ce qu'il a le droit de faire)</p>
          <MultiChipGroup label="Privilèges" value={v.privileges} onChange={set('privileges')} options={privileges.map((p) => ({ value: p.code, label: p.libelle }))} />
        </div>

        {edition && (
          <label className="ps-check">
            <input type="checkbox" checked={v.actif} disabled={soi} onChange={(e) => set('actif')(e.target.checked)} />
            <span className="t ps-check-text">Compte actif (décochez pour empêcher la connexion){soi ? ' — impossible pour vous-même' : ''}</span>
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
            {busy ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Créer l’employé'}
          </button>
        </div>
      </form>
    </Popup>
  )
}
