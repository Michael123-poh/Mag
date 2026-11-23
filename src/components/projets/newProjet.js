// Données et validations de la fiche « Nouveau projet » (mêmes règles que l'API).
//
// Un projet = des services. On les obtient soit en choisissant un bouquet, soit à la carte.
// Chaque service a son prix ; le total du projet est la somme des prix.

export const emptyProjet = {
  client: null, // { id, nom, code }
  titre: '',
  mode: '', // 'bouquet' | 'carte'
  bouquet: '', // code du bouquet choisi
  bouquetPrix: 0, // prix du bouquet choisi : les prix des services doivent en faire la somme
  lignes: [], // [{ service, libelle, saisie, quantite, detail, prix, fixe }]
  debut: '',
  fin: '',
  notes: '',
}

// Une ligne de projet à partir d'un service du catalogue (à la carte) ou d'une ligne de bouquet
export const newLine = (s, from = {}) => ({
  service: s.code ?? s.service,
  libelle: s.libelle,
  saisie: s.saisie,
  quantite: from.quantite ? String(from.quantite) : '',
  detail: from.detail ?? '',
  prix: '',
  fixe: !!(from.quantite || from.detail), // déjà précisé par le bouquet : pas modifiable ici
})

// Ce qu'il reste à préciser sur un service : un nombre (pack visuel), le type de template, les réseaux (cover)
export const needsSpec = (l) => (l.saisie === 'quantite' && !(Number(l.quantite) >= 1)) || ((l.saisie === 'template' || l.saisie === 'reseaux') && !l.detail)

// « Pack visuel × 10 », « Cover réseaux sociaux — Facebook, LinkedIn » (même texte que celui enregistré par l'API)
export const labelOf = (l) => `${l.libelle}${l.saisie === 'quantite' && l.quantite ? ` × ${l.quantite}` : ''}${l.detail ? ` — ${l.detail}` : ''}`

// Somme des prix déjà saisis, et total du projet : le prix du bouquet s'il y en a un, sinon la somme des services
export const sumOf = (v) => v.lignes.reduce((n, l) => n + (Number(l.prix) || 0), 0)
export const totalOf = (v) => (v.mode === 'bouquet' ? v.bouquetPrix : sumOf(v))

// Répartition égale du prix du bouquet entre ses services (le reste de la division va au premier service)
export function splitEvenly(v) {
  const n = v.lignes.length
  const part = Math.floor(v.bouquetPrix / n)
  const rest = v.bouquetPrix - part * n
  return v.lignes.map((l, i) => ({ ...l, prix: String(part + (i === 0 ? rest : 0)) }))
}

// Partie 1 : client + nom · Partie 2 : services · Partie 3 : prix de chaque service · Partie 4 : dates
// Les erreurs par service ont pour clé « spec:code » (à préciser) ou « prix:code ».
export function checkStep(view, v) {
  const e = {}
  if (view === 1) {
    if (!v.client) e.client = 'Choisissez un client dans la liste'
    if (v.titre.trim().length < 2) e.titre = 'Indiquez le nom du projet'
  } else if (view === 2) {
    if (!v.mode) e.mode = 'Choisissez un bouquet ou construisez le projet'
    else if (v.mode === 'bouquet' && !v.bouquet) e.bouquet = 'Choisissez un bouquet'
    else if (v.mode === 'carte' && v.lignes.length === 0) e.services = 'Choisissez au moins un service'
    for (const l of v.lignes) if (needsSpec(l)) e[`spec:${l.service}`] = 'À préciser'
  } else if (view === 3) {
    for (const l of v.lignes) if (l.prix === '') e[`prix:${l.service}`] = 'Indiquez le prix'
    if (v.mode === 'bouquet' && Object.keys(e).length === 0 && sumOf(v) !== v.bouquetPrix) {
      const gap = v.bouquetPrix - sumOf(v)
      e.repartition = `La somme doit être égale au prix du bouquet (${gap > 0 ? `il manque ${gap.toLocaleString('fr-FR')}` : `${(-gap).toLocaleString('fr-FR')} en trop`} xaf)`
    }
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.debut)) e.debut = 'Indiquez le début'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.fin)) e.fin = 'Indiquez la fin'
    else if (/^\d{4}-\d{2}-\d{2}$/.test(v.debut) && v.fin < v.debut) e.fin = 'Après le début'
  }
  return e
}

// Corps de la requête POST /api/projets
export const toBody = (v) => ({
  client_id: v.client.id,
  titre: v.titre.trim(),
  bouquet: v.mode === 'bouquet' ? v.bouquet : null,
  lignes: v.lignes.map((l) => ({
    service: l.service,
    quantite: l.saisie === 'quantite' ? Number(l.quantite) : null,
    detail: l.detail.trim() || null,
    prix: Number(l.prix),
  })),
  date_debut: v.debut,
  date_fin: v.fin,
  description: v.notes.trim(),
})
