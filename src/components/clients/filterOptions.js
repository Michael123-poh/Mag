// Catégories du pop-up de filtres. Chaque catégorie = une ligne de petites cartes (une seule sélection).
// allowNone : on peut désélectionner en recliquant (= pas de filtre sur cette catégorie).
const paliers = ['10', '20', '50', '70', '100'].map((n) => ({ value: n, label: `> ${n}K` }))

export const categories = [
  {
    key: 'client',
    label: 'Client',
    allowNone: false,
    options: [
      { value: 'tout', label: 'Tout' },
      { value: 'entreprise', label: 'Entreprise' },
      { value: 'personne', label: 'Personnel' },
    ],
  },
  {
    key: 'process',
    label: 'Process',
    allowNone: true,
    options: [
      { value: 'projet-cours', label: 'Projet en cours' },
      { value: 'projet', label: 'Au moins 1 projet' },
      { value: 'prestation-cours', label: 'Prestation en cours' },
      { value: 'prestation', label: 'Au moins 1 prestation' },
      { value: 'projet-prestation', label: 'Projet & prestation' },
    ],
  },
  { key: 'solde', label: 'Solde', allowNone: true, options: paliers },
  { key: 'acompte', label: 'Acompte', allowNone: true, options: paliers },
  {
    key: 'anciennete',
    label: 'Ancienneté',
    allowNone: true,
    options: [
      { value: 'recent', label: 'Récent' },
      { value: '1m', label: '1 mois' },
      { value: '3m', label: '3 mois' },
      { value: '6m', label: '6 mois' },
      { value: '1a', label: '1 an' },
      { value: '3a', label: '3 ans' },
    ],
  },
]

export const defaultFilters = { client: 'tout', process: null, solde: null, acompte: null, anciennete: null }

// Filtres choisis -> paramètres envoyés à l'API
export const toParams = (f) => ({
  type: f.client === 'tout' ? '' : f.client,
  process: f.process ?? '',
  solde: f.solde ?? '',
  acompte: f.acompte ?? '',
  anciennete: f.anciennete ?? '',
})

const clientText = { tout: 'Tous les clients', entreprise: 'Les entreprises', personne: 'Les personnes' }
const processText = {
  'projet-cours': 'ayant un projet en cours',
  projet: 'ayant au moins un projet',
  'prestation-cours': 'ayant une prestation en cours',
  prestation: 'ayant au moins une prestation',
  'projet-prestation': 'ayant des projets et des prestations',
}
const ancienneteText = {
  recent: 'clients récents (30 derniers jours)',
  '1m': "clients depuis plus d'un mois",
  '3m': 'clients depuis plus de 3 mois',
  '6m': 'clients depuis plus de 6 mois',
  '1a': "clients depuis plus d'un an",
  '3a': 'clients depuis plus de 3 ans',
}

// Mots affichés sur la carte active quand son filtre est personnalisé
const cardType = { tout: 'Tous les clients', entreprise: 'Clients Entreprise', personne: 'Clients Personnel' }
const cardProcess = {
  'projet-cours': 'projet en cours',
  projet: 'au moins 1 projet',
  'prestation-cours': 'prestation en cours',
  prestation: 'au moins 1 prestation',
  'projet-prestation': 'projet & prestation',
}
const cardAnciennete = { recent: 'récents', '1m': 'depuis 1 mois', '3m': 'depuis 3 mois', '6m': 'depuis 6 mois', '1a': 'depuis 1 an', '3a': 'depuis 3 ans' }

export function cardLabels(f) {
  const parts = []
  if (f.process) parts.push(cardProcess[f.process])
  if (f.solde) parts.push(`solde > ${f.solde}K`)
  if (f.acompte) parts.push(`acompte > ${f.acompte}K`)
  if (f.anciennete) parts.push(cardAnciennete[f.anciennete])
  return { title: cardType[f.client], caption: parts.length ? parts.join(' · ') : 'sans autre filtre' }
}

// Phrase discrète qui résume les filtres choisis.
export function summarize(f) {
  const parts = []
  if (f.process) parts.push(processText[f.process])
  if (f.solde) parts.push(`avec un solde supérieur à ${f.solde}K`)
  if (f.acompte) parts.push(`avec un acompte supérieur à ${f.acompte}K`)
  if (f.anciennete) parts.push(ancienneteText[f.anciennete])
  const head = clientText[f.client]
  return parts.length ? `${head} ${parts.join(', ')}.` : `${head}, sans autre filtre.`
}
