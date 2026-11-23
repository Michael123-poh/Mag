import { ChipGroup, MultiChipGroup, NumberInput, TextInput } from '../wizard/Fields.jsx'
import { labelOf } from './newProjet.js'

// Ce qu'il faut préciser pour un service du projet :
//   Pack visuel → le nombre · Templates → post, post + stories, stories ou complet · Cover → les réseaux sociaux · Concept → un texte libre
//   line : { service, libelle, saisie, quantite, detail, fixe } · onChange : reçoit la ligne modifiée
//   Un service déjà précisé par le bouquet s'affiche simplement (pas modifiable ici).
export default function ServiceSpec({ line, templates, reseaux, onChange, invalid }) {
  const set = (patch) => onChange({ ...line, ...patch })
  const editable = !line.fixe && line.saisie !== 'aucune'

  return (
    <li className="pjn-spec" data-invalid={invalid}>
      <p className="t pn-line-name">{editable ? line.libelle : labelOf(line)}</p>

      {editable && line.saisie === 'quantite' && (
        <NumberInput value={line.quantite} onChange={(quantite) => set({ quantite })} invalid={invalid} maxLength={3} aria-label={`Nombre — ${line.libelle}`} suffix="visuels" />
      )}
      {editable && line.saisie === 'template' && (
        <ChipGroup label={line.libelle} value={line.detail} onChange={(detail) => set({ detail })} options={templates.map((t) => ({ value: t, label: t }))} invalid={invalid} />
      )}
      {editable && line.saisie === 'reseaux' && (
        <MultiChipGroup
          label={line.libelle}
          value={line.detail ? line.detail.split(', ') : []}
          onChange={(list) => set({ detail: reseaux.filter((r) => list.includes(r)).join(', ') })}
          options={reseaux.map((r) => ({ value: r, label: r }))}
          invalid={invalid}
        />
      )}
      {editable && line.saisie === 'texte' && (
        <TextInput value={line.detail} onChange={(detail) => set({ detail })} maxLength={120} placeholder="Précision (facultatif) — ex. campagne de lancement" aria-label={`Précision — ${line.libelle}`} />
      )}
    </li>
  )
}
