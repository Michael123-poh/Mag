// Données et validations de la fiche « Nouvelle prestation » (mêmes règles que l'API ; les prix viennent de la grille des tarifs).

export const emptyPrestation = {
  client: null, // { id, nom, code }
  titre: '',
  service: '', // photocopie | mise-en-page | impression
  pages: '', // photocopie, mise en page
  couleur: '', // photocopie : N/B ou Quadri
  format: 'A4', // photocopie (presque toujours A4)
  tirage: '', // photocopie : Recto ou Recto/Verso
  prixPage: '', // mise en page
  lignes: [], // impression : [{ tarifId, reference, libelle, prix, quantite }]
  date: '', // date de livraison
  notes: '',
}

// Partie 1 : le client, le nom, le service
// Partie 2 : le détail du service
// Partie 3 : livraison
export function checkStep(view, v) {
  const e = {}
  if (view === 1) {
    if (!v.client) e.client = 'Choisissez un client dans la liste'
    if (v.titre.trim().length < 2) e.titre = 'Indiquez le nom de la prestation'
    if (!v.service) e.service = 'Choisissez un service'
  } else if (view === 2) {
    if (v.service === 'photocopie') {
      if (!(Number(v.pages) >= 1)) e.pages = 'Indiquez le nombre de pages'
      if (!v.couleur) e.couleur = 'Choisissez la couleur'
      if (!v.format) e.format = 'Choisissez le format'
      if (!v.tirage) e.tirage = 'Choisissez le tirage'
    } else if (v.service === 'mise-en-page') {
      if (!(Number(v.pages) >= 1)) e.pages = 'Indiquez le nombre de pages'
      if (!(Number(v.prixPage) >= 1)) e.prixPage = 'Indiquez le prix de la page'
    } else if (v.lignes.length === 0) {
      e.lignes = 'Ajoutez au moins un produit'
    }
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) {
    e.date = 'Indiquez la date de livraison'
  }
  return e
}

// Lignes du récapitulatif : [{ label, quantite, prix, total }]
export function linesOf(v, prixPhotocopie) {
  if (v.service === 'photocopie') {
    const q = Number(v.pages) || 0
    return [{ label: `Photocopie ${v.format} · ${v.couleur || '—'} · ${v.tirage || '—'}`, quantite: q, prix: prixPhotocopie, total: q * prixPhotocopie }]
  }
  if (v.service === 'mise-en-page') {
    const q = Number(v.pages) || 0
    const p = Number(v.prixPage) || 0
    return [{ label: 'Mise en page', quantite: q, prix: p, total: q * p }]
  }
  return v.lignes.map((l) => ({ label: l.libelle, quantite: l.quantite, prix: l.prix, total: l.quantite * l.prix }))
}

export const totalOf = (lines) => lines.reduce((n, l) => n + l.total, 0)

// Corps de la requête POST /api/prestations
export function toBody(v) {
  const base = { client_id: v.client.id, titre: v.titre.trim(), service: v.service, date_livraison: v.date, notes: v.notes.trim() }
  if (v.service === 'photocopie') return { ...base, pages: Number(v.pages), couleur: v.couleur, format: v.format, tirage: v.tirage }
  if (v.service === 'mise-en-page') return { ...base, pages: Number(v.pages), prix_page: Number(v.prixPage) }
  return { ...base, lignes: v.lignes.map((l) => ({ tarif_id: l.tarifId, quantite: l.quantite, prix: l.prix })) }
}
