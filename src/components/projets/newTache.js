// Données et validations de la fiche « Nouvelle tâche » (mêmes règles que l'API).

export const emptyTache = {
  titre: '',
  assignee: '', // identifiant de l'employé (texte)
  notes: [], // sous-tâches (facultatives)
  draft: '', // sous-tâche en cours de saisie, pas encore ajoutée à la liste
  date: '', // date d'exécution
  debut: '', // heure de début (HH:MM)
  fin: '', // heure de fin (HH:MM)
}

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/

// Partie 1 : nom + employé · Partie 2 : sous-tâches (rien d'obligatoire) · Partie 3 : date et heures
export function checkStep(view, v) {
  const e = {}
  if (view === 1) {
    if (v.titre.trim().length < 2) e.titre = 'Indiquez le nom de la tâche'
    if (!v.assignee) e.assignee = "Choisissez l'employé"
  } else if (view === 3) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) e.date = "Indiquez la date d'exécution"
    if (!HEURE.test(v.debut)) e.debut = "Heure de début"
    if (!HEURE.test(v.fin)) e.fin = 'Heure de fin'
    else if (HEURE.test(v.debut) && v.fin <= v.debut) e.fin = "Après l'heure de début"
  }
  return e
}

// Corps de la requête POST /api/projets/:id/taches
export const toBody = (v) => ({
  titre: v.titre.trim(),
  assignee_id: Number(v.assignee),
  notes: v.notes,
  date: v.date,
  debut: v.debut,
  fin: v.fin,
})

// Ajoute la sous-tâche en cours de saisie à la liste (ignorée si vide)
export function withDraft(v) {
  const text = v.draft.trim()
  return text ? { ...v, notes: [...v.notes, text], draft: '' } : v
}
