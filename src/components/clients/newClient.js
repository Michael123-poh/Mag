// Données et validations de la fiche « Nouveau partenaire » (mêmes règles que l'API).

// Indicatifs proposés : drapeau dessiné en dégradé (direction + 3 couleurs)
export const COUNTRIES = [
  { code: 'CMR', dial: '+237', flag: 'linear-gradient(90deg, #007a5e 33.3%, #ce1126 33.3% 66.6%, #fcd116 66.6%)' },
  { code: 'GAB', dial: '+241', flag: 'linear-gradient(180deg, #009e60 33.3%, #fcd116 33.3% 66.6%, #3a75c4 66.6%)' },
  { code: 'TCD', dial: '+235', flag: 'linear-gradient(90deg, #002664 33.3%, #fecb00 33.3% 66.6%, #c60c30 66.6%)' },
  { code: 'GNQ', dial: '+240', flag: 'linear-gradient(180deg, #3e9a00 33.3%, #ffffff 33.3% 66.6%, #e32118 66.6%)' },
  { code: 'NGA', dial: '+234', flag: 'linear-gradient(90deg, #008751 33.3%, #ffffff 33.3% 66.6%, #008751 66.6%)' },
  { code: 'FRA', dial: '+33', flag: 'linear-gradient(90deg, #002395 33.3%, #ffffff 33.3% 66.6%, #ed2939 66.6%)' },
]

export const emptyClient = {
  nom: '',
  ville: '',
  pays: 'CMR',
  numero: '',
  email: '',
  forme: '',
  activite: '',
  chiffre: '',
}

// Partie 1 : coordonnées
export function checkContact(v) {
  const e = {}
  if (v.nom.trim().length < 2) e.nom = 'Indiquez le nom'
  if (v.ville.trim().length < 2) e.ville = 'Indiquez la ville'
  if (!/^\d{6,12}$/.test(v.numero)) e.numero = 'Numéro invalide (6 à 12 chiffres)'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Adresse e-mail invalide'
  return e
}

// Partie 2 : activité
export function checkActivite(v) {
  const e = {}
  if (!v.forme) e.forme = 'Choisissez une forme juridique'
  if (!v.activite) e.activite = "Choisissez l'activité"
  return e
}

// Corps de la requête POST /api/clients
export function toBody(v) {
  const dial = COUNTRIES.find((c) => c.code === v.pays).dial
  return {
    nom: v.nom.trim(),
    ville: v.ville.trim(),
    telephone: `${dial} ${v.numero}`,
    email: v.email.trim(),
    forme_juridique: v.forme,
    activite: v.activite,
    chiffre_affaire: v.chiffre ? Number(v.chiffre) : null,
  }
}
