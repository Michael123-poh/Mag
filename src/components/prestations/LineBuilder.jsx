import { useState } from 'react'
import { X } from 'lucide-react'
import { fmtMoney } from '../../lib/format.js'
import { ChipGroup, Field, NumberInput, SelectInput } from '../wizard/Fields.jsx'

// Colonnes de la grille des tarifs, dans l'ordre des questions
const COLUMNS = [
  { key: 'format', label: 'Format' },
  { key: 'couleur', label: 'Couleur / Face' },
  { key: 'support', label: 'Support / Finition' },
]

// À partir de la famille choisie, ne propose que les valeurs qui existent dans la grille.
// Une colonne qui n'a qu'une valeur est choisie d'office ; on s'arrête à la première colonne pas encore choisie.
function cascade(tarifs, pick) {
  let candidates = tarifs.filter((t) => t.famille === pick.famille)
  const questions = []
  let complete = true
  for (const col of COLUMNS) {
    const options = [...new Set(candidates.map((t) => t[col.key]).filter(Boolean))]
    if (options.length === 0) continue
    if (options.length === 1) {
      candidates = candidates.filter((t) => t[col.key] === options[0])
      continue
    }
    const value = options.includes(pick[col.key]) ? pick[col.key] : ''
    questions.push({ ...col, options, value })
    if (!value) {
      complete = false
      break
    }
    candidates = candidates.filter((t) => t[col.key] === value)
  }
  return { questions, tarif: complete && pick.famille && candidates.length === 1 ? candidates[0] : null }
}

const lineKey = (l) => `${l.tarifId}@${l.prix}`

// Impression : on compose la commande ligne par ligne à partir de la grille des tarifs.
//   tarifs   : [{ id, reference, libelle, famille, format, couleur, support, prix }]
//   lignes   : lignes déjà ajoutées · onChange : reçoit la nouvelle liste
export default function LineBuilder({ tarifs, lignes, onChange, error }) {
  const [pick, setPick] = useState({ famille: '', format: '', couleur: '', support: '' })
  const [quantite, setQuantite] = useState('')
  const [prixEdit, setPrixEdit] = useState({ tarifId: null, value: '' }) // prix unitaire modifié pour le produit en cours
  const familles = [...new Set(tarifs.map((t) => t.famille))]
  const { questions, tarif } = cascade(tarifs, pick)
  // Prix unitaire proposé : celui de la grille, modifiable ; on le remet à celui de la grille dès que l'on change de produit
  const prixValue = tarif ? (prixEdit.tarifId === tarif.id ? prixEdit.value : String(tarif.prix)) : ''
  const canAdd = !!tarif && Number(quantite) >= 1 && prixValue !== ''

  const choose = (key) => (value) => {
    const next = { ...pick, [key]: value }
    // changer une réponse efface celles qui suivent
    const after = key === 'famille' ? COLUMNS : COLUMNS.slice(COLUMNS.findIndex((c) => c.key === key) + 1)
    for (const c of after) next[c.key] = ''
    setPick(next)
  }

  const add = () => {
    if (!canAdd) return
    const q = Number(quantite)
    const prix = Number(prixValue)
    // même produit au même prix : on additionne les quantités ; à un autre prix : nouvelle ligne
    const existing = lignes.find((l) => lineKey(l) === `${tarif.id}@${prix}`)
    onChange(
      existing
        ? lignes.map((l) => (l === existing ? { ...l, quantite: l.quantite + q } : l))
        : [...lignes, { tarifId: tarif.id, reference: tarif.reference, libelle: tarif.libelle, prix, quantite: q }],
    )
    setQuantite('')
    setPick({ famille: pick.famille, format: '', couleur: '', support: '' })
  }

  return (
    <div className="nc-grid grid">
      <Field label="Prestation" className="nc-full">
        <ChipGroup
          label="Prestation"
          value={pick.famille}
          onChange={choose('famille')}
          options={familles.map((f) => ({ value: f, label: f }))}
        />
      </Field>

      {questions.map((q) => (
        <Field key={q.key} label={q.label}>
          <SelectInput value={q.value} onChange={choose(q.key)} options={q.options} label={q.label} />
        </Field>
      ))}

      {tarif && (
        <>
          <Field label="Quantité">
            <NumberInput
              value={quantite}
              onChange={setQuantite}
              maxLength={7}
              aria-label="Quantité"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
            />
          </Field>
          <Field label="Prix unitaire">
            <NumberInput
              value={prixValue}
              onChange={(value) => setPrixEdit({ tarifId: tarif.id, value })}
              suffix="xaf"
              maxLength={9}
              aria-label="Prix unitaire"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
            />
          </Field>
          <div className="pn-add-box nc-full flex items-center justify-between gap-4">
            <p className="t pn-resolved">
              {tarif.reference} · prix de la grille : {fmtMoney(tarif.prix)} xaf
            </p>
            <button type="button" onClick={add} className="t pn-add rounded-full bg-gaia-700 text-white" disabled={!canAdd}>
              Ajouter
            </button>
          </div>
        </>
      )}

      <div className="nc-full" data-invalid={!!error && lignes.length === 0}>
        {lignes.length > 0 && (
          <ul className="pn-lines">
            {lignes.map((l) => (
              <li key={lineKey(l)} className="pn-line flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="t pn-line-name">{l.libelle}</p>
                  <p className="t pn-line-sub">
                    {fmtMoney(l.quantite)} × {fmtMoney(l.prix)} xaf
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="t pn-line-total">{fmtMoney(l.quantite * l.prix)} xaf</span>
                  <button type="button" aria-label={`Retirer ${l.libelle}`} onClick={() => onChange(lignes.filter((x) => lineKey(x) !== lineKey(l)))} className="pn-line-remove">
                    <X size={18} strokeWidth={2.4} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && lignes.length === 0 && <span className="t nc-error">{error}</span>}
      </div>
    </div>
  )
}
