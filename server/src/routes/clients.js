import { Router } from 'express'
import { z } from 'zod'
import { loadCards } from '../cards.js'
import { pool, query, queryOne } from '../db.js'
import { addMonths, addDays, asyncJson, today, toneOf } from '../util.js'

const router = Router()

// Valeurs acceptées pour chaque filtre (tout le reste est ignoré)
const TYPES = { entreprise: 'Entreprise', personne: 'Personne' }
const PROCESS = ['projet-cours', 'projet', 'prestation-cours', 'prestation', 'projet-prestation']
const PALIERS = ['10', '20', '50', '70', '100'] // en milliers de xaf
const ANCIENNETE = { '1m': 1, '3m': 3, '6m': 6, '1a': 12, '3a': 36 } // en mois (client existant depuis au moins ...)

const one = (v) => (typeof v === 'string' ? v : '')

// Filtre enregistré d'une carte -> paramètres du même format que l'URL
const toParams = (f) => ({
  type: f.client === 'tout' ? '' : f.client,
  process: f.process ?? '',
  solde: f.solde ?? '',
  acompte: f.acompte ?? '',
  anciennete: f.anciennete ?? '',
})

// Construit le WHERE (et ses paramètres) à partir des filtres
function buildFilter(p, t) {
  const q = one(p.q).trim().slice(0, 80)
  const type = TYPES[one(p.type)]
  const process = PROCESS.includes(one(p.process)) ? one(p.process) : ''
  const solde = PALIERS.includes(one(p.solde)) ? Number(p.solde) * 1000 : null
  const acompte = PALIERS.includes(one(p.acompte)) ? Number(p.acompte) * 1000 : null
  const anciennete = ANCIENNETE[one(p.anciennete)]
  const recent = one(p.anciennete) === 'recent' // activité dans les 30 derniers jours

  const where = []
  const params = []
  if (q) {
    where.push('(c.nom LIKE ? OR c.code LIKE ? OR c.telephone LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (type) {
    where.push('tc.libelle = ?')
    params.push(type)
  }
  const hasProjet = 'EXISTS (SELECT 1 FROM projets pr WHERE pr.client_id = c.id)'
  const hasPrestation = 'EXISTS (SELECT 1 FROM prestations pe WHERE pe.client_id = c.id)'
  if (process === 'projet-cours') where.push("EXISTS (SELECT 1 FROM projets pr WHERE pr.client_id = c.id AND pr.statut = 'en_cours')")
  if (process === 'projet') where.push(hasProjet)
  if (process === 'prestation-cours') where.push("EXISTS (SELECT 1 FROM prestations pe WHERE pe.client_id = c.id AND pe.statut_production = 'en_cours')")
  if (process === 'prestation') where.push(hasPrestation)
  if (process === 'projet-prestation') where.push(`${hasProjet} AND ${hasPrestation}`)
  if (solde !== null) {
    where.push('COALESCE(s.solde_du, 0) > ?')
    params.push(solde)
  }
  if (acompte !== null) {
    // acompte = somme déjà versée sur des factures pas encore soldées
    where.push(
      `COALESCE((SELECT SUM(vf.encaisse) FROM v_factures vf
                  WHERE vf.client_id = c.id AND vf.reste > 0 AND vf.encaisse > 0), 0) > ?`,
    )
    params.push(acompte)
  }
  if (recent) {
    where.push('DATE(c.updated_at) >= ?')
    params.push(addDays(t, -30))
  }
  if (anciennete) {
    where.push('DATE(c.created_at) <= ?')
    params.push(addMonths(t, -anciennete))
  }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}

const FROM = `FROM clients c
         JOIN types_client tc ON tc.id = c.type_client_id
         LEFT JOIN v_clients_solde s ON s.client_id = c.id`

// ----- Création d'un client (fiche « Nouveau partenaire » en deux parties) ---------------------------
export const FORMES = ['Particulier', 'Entreprise individuelle', 'SARL', 'SA', 'SAS', 'GIE', 'Association', 'ONG', 'Administration publique']
export const ACTIVITES = [
  'Commerce', 'Services', 'Industrie', 'Agriculture', 'Éducation', 'Santé', 'Restauration et hôtellerie',
  'Immobilier et BTP', 'Transport', 'Communication et médias', 'Technologie', 'Autre',
]

const NewClient = z.object({
  nom: z.string().trim().min(2).max(160),
  ville: z.string().trim().min(2).max(80),
  telephone: z.string().trim().regex(/^\+\d{1,3} \d{6,12}$/),
  email: z.string().trim().email().max(160),
  forme_juridique: z.enum(FORMES),
  activite: z.enum(ACTIVITES),
  chiffre_affaire: z.number().int().min(0).max(1e12).nullable(),
})

// Listes proposées dans les menus déroulants de la fiche
router.get('/options', (req, res) => res.json({ formes: FORMES, activites: ACTIVITES }))

router.post('/', async (req, res, next) => {
  try {
    const parsed = NewClient.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Informations invalides : vérifiez les champs' })
    const c = parsed.data

    if (await queryOne('SELECT id FROM clients WHERE email = ?', [c.email])) {
      return res.status(409).json({ error: 'Un client avec cet e-mail existe déjà' })
    }

    // Particulier = client « Personne » ; toute autre forme juridique = « Entreprise »
    const isPerson = c.forme_juridique === 'Particulier'
    const type = await queryOne('SELECT id FROM types_client WHERE libelle = ?', [isPerson ? 'Personne' : 'Entreprise'])

    // Le code (ex. CL-EN012) dépend de l'identifiant : on l'ajuste juste après l'insertion, dans la même transaction
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const tmp = `TMP-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 20)
      const [ins] = await conn.execute(
        `INSERT INTO clients (code, nom, type_client_id, telephone, email, ville, forme_juridique, activite, chiffre_affaire)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tmp, c.nom, type.id, c.telephone, c.email, c.ville, c.forme_juridique, c.activite, c.chiffre_affaire],
      )
      const code = `CL-${isPerson ? 'PE' : 'EN'}${String(ins.insertId).padStart(3, '0')}`
      await conn.execute('UPDATE clients SET code = ? WHERE id = ?', [code, ins.insertId])
      await conn.commit()
      res.status(201).json({ id: ins.insertId, code })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(503).json({ error: 'Colonnes manquantes : exécutez database/migration_partenaire.sql' })
    }
    next(err)
  }
})

const PAGE_SIZE = 10

router.get(
  '/',
  asyncJson(async (req) => {
    const t = today()

    const { where, params } = buildFilter(req.query, t)
    const { n: total } = await queryOne(`SELECT COUNT(*) AS n ${FROM} ${where}`, params)
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const asked = Number.parseInt(one(req.query.page), 10)
    const page = Math.min(Math.max(Number.isInteger(asked) ? asked : 1, 1), pages)
    const offset = (page - 1) * PAGE_SIZE // entiers calculés ici : sûrs à écrire dans la requête

    const rows = await query(
      `SELECT c.id AS id, c.code AS code, c.nom AS nom, tc.libelle AS type, c.telephone AS telephone,
              c.updated_at AS maj, COALESCE(s.solde_du, 0) AS solde
         ${FROM}
        ${where}
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params,
    )

    // Cartes « dossier » : filtre personnalisé de l'employé + nombre de clients que ce filtre donne
    const cards = await loadCards(req.user.id, 'clients')
    const folders = []
    for (const card of cards) {
      const f = buildFilter(toParams(card.filters), t)
      const n = await queryOne(`SELECT COUNT(*) AS n ${FROM} ${f.where}`, f.params)
      folders.push({ slot: card.slot, filters: card.filters, custom: card.custom, count: n.n })
    }

    return { folders, clients: rows.map((r) => ({ ...r, tone: toneOf(r.id) })), page, pages, total, size: PAGE_SIZE }
  }),
)

export default router
