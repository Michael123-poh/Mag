// Les deux statuts d'une commande de stock, indépendants :
//   paiement  (l'argent)       : Payé · Acompte · Non payé
//   réception (la marchandise) : Reçu · En partie · Non reçu
// tone = classes de la pastille

export const PAIEMENT = {
  paye: { label: 'Payé', tone: 'bg-gaia-200 text-gaia-900' },
  acompte: { label: 'Acompte', tone: 'bg-gaia-500 text-white' },
  non_paye: { label: 'Non payé', tone: 'bg-accent text-white' },
}

export const RECEPTION = {
  recu: { label: 'Reçu', tone: 'bg-gaia-200 text-gaia-900' },
  partiel: { label: 'En partie', tone: 'bg-gaia-500 text-white' },
  non_recu: { label: 'Non reçu', tone: 'bg-accent text-white' },
}
