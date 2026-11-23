import { z } from 'zod'
import { query } from './db.js'

// Filtres personnalisés des 3 cartes « dossier » de chaque page : un par employé, conservés jusqu'à ce qu'il les change.

const nullable = (values) => z.enum(values).nullable()
const PALIERS = ['10', '20', '50', '70', '100']

export const SCHEMAS = {
  clients: z
    .object({
      client: z.enum(['tout', 'entreprise', 'personne']),
      process: nullable(['projet-cours', 'projet', 'prestation-cours', 'prestation', 'projet-prestation']),
      solde: nullable(PALIERS),
      acompte: nullable(PALIERS),
      anciennete: nullable(['recent', '1m', '3m', '6m', '1a', '3a']),
    })
    .strict(),
  prestations: z
    .object({
      type: nullable(['impression', 'photocopie', 'saisie', 'mise-en-page']),
      production: nullable(['livre', 'encours', 'afaire']),
      periode: nullable(['ce-mois', '3m', '6m', '1a']),
      reglement: nullable(['paye', 'acompte', 'non-paye']),
    })
    .strict(),
}

export const PRIVILEGE = { clients: 'gerer_clients', prestations: 'gerer_prestations' }

// Filtres de départ (tant que l'employé n'a pas personnalisé la carte)
const nul = { process: null, solde: null, acompte: null, anciennete: null }
export const DEFAULTS = {
  clients: [
    { ...nul, client: 'entreprise', process: 'projet-prestation' },
    { ...nul, client: 'entreprise', solde: '100' },
    { ...nul, client: 'personne', anciennete: 'recent' },
  ],
  prestations: [
    { type: 'saisie', production: null, periode: null, reglement: 'acompte' },
    { type: 'impression', production: 'encours', periode: null, reglement: null },
    { type: 'mise-en-page', production: null, periode: 'ce-mois', reglement: null },
  ],
}

const isMissingTable = (err) => err?.code === 'ER_NO_SUCH_TABLE'

// [{ slot, filters, custom }] pour les 3 cartes d'une page
export async function loadCards(employeId, page) {
  let rows = []
  try {
    rows = await query('SELECT slot, filtres FROM filtres_cartes WHERE employe_id = ? AND page = ?', [employeId, page])
  } catch (err) {
    if (!isMissingTable(err)) throw err // table pas encore créée : on affiche les filtres de départ
  }
  return DEFAULTS[page].map((def, slot) => {
    const row = rows.find((r) => r.slot === slot)
    if (row) {
      try {
        const raw = typeof row.filtres === 'string' ? JSON.parse(row.filtres) : row.filtres
        const parsed = SCHEMAS[page].safeParse(raw)
        if (parsed.success) return { slot, filters: parsed.data, custom: true }
      } catch {
        /* filtre illisible : retour au filtre de départ */
      }
    }
    return { slot, filters: def, custom: false }
  })
}

export async function saveCard(employeId, page, slot, filters) {
  await query(
    `INSERT INTO filtres_cartes (employe_id, page, slot, filtres) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE filtres = VALUES(filtres)`,
    [employeId, page, slot, JSON.stringify(filters)],
  )
}

export { isMissingTable }
