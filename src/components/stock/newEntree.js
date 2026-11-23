// Données et validations de la fiche « Entrée de stock » (mêmes règles que l'API).
//
// Deux statuts INDÉPENDANTS :
//   paiement  = l'argent        -> payé · non payé
//   réception = la marchandise  -> reçu · en partie · non reçu

export const emptyEntree = {
  produit: null, // { id, code, nom, unite, fournisseurId, prix }
  fournisseur: '', // identifiant (texte)
  quantite: '', // quantité commandée, dans l'unité du produit (rames, unités…)
  prix: '', // prix unitaire
  reception: '', // recu | partiel | non_recu
  recue: '', // quantité réellement reçue (si « en partie »)
  date: '', // date de livraison (prévue si rien n'est encore reçu)
  paiement: '', // paye | acompte | non_paye
  verse: '', // acompte : somme déjà versée
  compte: '', // caisse | banque | mobile (si payé)
}

export const RECEPTIONS = [
  { value: 'recu', label: 'Reçu' },
  { value: 'partiel', label: 'En partie' },
  { value: 'non_recu', label: 'Non reçu' },
]
export const PAIEMENTS = [
  { value: 'paye', label: 'Payé' },
  { value: 'acompte', label: 'Acompte' },
  { value: 'non_paye', label: 'Non payé' },
]

// Partie 1 : produit, fournisseur, quantité, prix · Partie 2 : réception · Partie 3 : paiement
export function checkStep(view, v) {
  const e = {}
  if (view === 1) {
    if (!v.produit) e.produit = 'Choisissez un produit dans la liste'
    if (!v.fournisseur) e.fournisseur = 'Choisissez le fournisseur'
    if (!(Number(v.quantite) >= 1)) e.quantite = 'Indiquez la quantité'
    if (!(Number(v.prix) >= 1)) e.prix = 'Indiquez le prix unitaire'
  } else if (view === 2) {
    if (!v.reception) e.reception = 'Choisissez un statut de réception'
    if (v.reception === 'partiel') {
      if (!(Number(v.recue) >= 1)) e.recue = 'Indiquez la quantité reçue'
      else if (Number(v.recue) >= Number(v.quantite)) e.recue = 'Doit être inférieure à la quantité commandée'
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) e.date = 'Indiquez la date de livraison'
  } else {
    if (!v.paiement) e.paiement = 'Choisissez un statut de paiement'
    if (v.paiement === 'acompte') {
      if (!(Number(v.verse) >= 1)) e.verse = "Indiquez la somme versée"
      else if (Number(v.verse) >= totalOf(v)) e.verse = 'Doit être inférieur au total'
    }
    if (v.paiement !== 'non_paye' && v.paiement && !v.compte) e.compte = 'Choisissez le compte qui a payé'
  }
  return e
}

export const totalOf = (v) => (Number(v.quantite) || 0) * (Number(v.prix) || 0)

// Quantité qui entre réellement dans le stock
export const recueOf = (v) => (v.reception === 'recu' ? Number(v.quantite) || 0 : v.reception === 'partiel' ? Number(v.recue) || 0 : 0)

// Corps de la requête POST /api/stock
export function toBody(v) {
  const body = {
    stock_id: v.produit.id,
    fournisseur_id: Number(v.fournisseur),
    quantite: Number(v.quantite),
    prix_unitaire: Number(v.prix),
    date: v.date,
    reception: v.reception,
    paiement: v.paiement,
  }
  if (v.reception === 'partiel') body.quantite_recue = Number(v.recue)
  if (v.paiement === 'acompte') body.montant_verse = Number(v.verse)
  if (v.paiement !== 'non_paye') body.compte = v.compte
  return body
}
