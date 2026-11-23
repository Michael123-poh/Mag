// Catégories du pop-up de filtres des prestations (une sélection par catégorie, recliquer = désélectionner).
export const categories = [
  {
    key: 'type',
    label: 'Type',
    allowNone: true,
    options: [
      { value: 'impression', label: 'Impression' },
      { value: 'photocopie', label: 'Photocopie' },
      { value: 'saisie', label: 'Saisie' },
      { value: 'mise-en-page', label: 'Mise en page' },
    ],
  },
  {
    key: 'production',
    label: 'Production',
    allowNone: true,
    options: [
      { value: 'livre', label: 'Livré' },
      { value: 'encours', label: 'Encours' },
      { value: 'afaire', label: 'À faire' },
    ],
  },
  {
    key: 'periode',
    label: 'Période',
    allowNone: true,
    options: [
      { value: 'ce-mois', label: 'Ce mois' },
      { value: '3m', label: '3 mois' },
      { value: '6m', label: '6 mois' },
      { value: '1a', label: '1 an' },
    ],
  },
  {
    key: 'reglement',
    label: 'Règlement',
    allowNone: true,
    options: [
      { value: 'paye', label: 'Payé' },
      { value: 'acompte', label: 'Acompte' },
      { value: 'non-paye', label: 'Non payé' },
    ],
  },
]

export const defaultFilters = { type: null, production: null, periode: null, reglement: null }

// Filtres choisis -> paramètres envoyés à l'API
export const toParams = (f) => ({
  type: f.type ?? '',
  production: f.production ?? '',
  periode: f.periode ?? '',
  reglement: f.reglement ?? '',
})

const typeText = {
  impression: 'de type impression',
  photocopie: 'de type photocopie',
  saisie: 'de type saisie',
  'mise-en-page': 'de type mise en page',
}
const productionText = { livre: 'livrées', encours: 'en cours de production', afaire: 'à faire' }
const reglementText = { paye: 'payées', acompte: 'avec acompte', 'non-paye': 'non payées' }
const periodeText = {
  'ce-mois': 'de ce mois',
  '3m': 'des 3 derniers mois',
  '6m': 'des 6 derniers mois',
  '1a': "de la dernière année",
}

// Mots affichés sur la carte active quand son filtre est personnalisé
const cardType = { impression: 'Impression', photocopie: 'Photocopie', saisie: 'Saisie', 'mise-en-page': 'Mise en page' }
const cardProduction = { livre: 'livrées', encours: 'en cours', afaire: 'à faire' }
const cardReglement = { paye: 'payées', acompte: 'avec acompte', 'non-paye': 'non payées' }
const cardPeriode = { 'ce-mois': 'ce mois', '3m': '3 derniers mois', '6m': '6 derniers mois', '1a': 'dernière année' }

export function cardLabels(f) {
  const parts = []
  if (f.production) parts.push(cardProduction[f.production])
  if (f.reglement) parts.push(cardReglement[f.reglement])
  if (f.periode) parts.push(cardPeriode[f.periode])
  return { title: f.type ? cardType[f.type] : 'Prestations', caption: parts.length ? parts.join(' · ') : 'toutes' }
}

// Phrase discrète qui résume les filtres choisis.
export function summarize(f) {
  const parts = []
  if (f.type) parts.push(typeText[f.type])
  if (f.production) parts.push(productionText[f.production])
  if (f.reglement) parts.push(reglementText[f.reglement])
  if (f.periode) parts.push(periodeText[f.periode])
  return parts.length
    ? `Les prestations ${parts.join(', ')}.`
    : 'Toutes les prestations, sans autre filtre.'
}
