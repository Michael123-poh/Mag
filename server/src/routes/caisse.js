import { Router } from 'express'
import { z } from 'zod'
import { query, queryOne } from '../db.js'
import { addDays, asyncJson, mondayOf, monthEnd, monthStart, toId, today } from '../util.js'

const router = Router()
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

router.get(
  '/',
  asyncJson(async () => {
    const t = today()
    const mStart = monthStart(t)
    const mEnd = monthEnd(t)

    // --- Comptes (solde = solde initial + encaissements - décaissements)
    const comptes = await query(
      `SELECT c.code AS code, c.libelle AS nom,
              c.solde_initial + COALESCE(SUM(CASE tt.sens WHEN 'encaissement' THEN t.montant WHEN 'decaissement' THEN -t.montant END), 0) AS montant
         FROM comptes c
         LEFT JOIN transactions t ON t.compte_id = c.id
         LEFT JOIN types_transaction tt ON tt.id = t.type_transaction_id
        GROUP BY c.id, c.code, c.libelle, c.solde_initial
        ORDER BY c.id`,
    )
    const total = comptes.reduce((s, c) => s + c.montant, 0)

    // --- Les 8 derniers encaissements et les 8 derniers décaissements (transactions réellement enregistrées)
    const derniers = (sens) =>
      query(
        `SELECT t.id AS id, t.libelle AS libelle, t.montant AS montant, t.date_transaction AS date,
                c.libelle AS compte, tt.libelle AS type, tt.code AS code
           FROM transactions t
           JOIN types_transaction tt ON tt.id = t.type_transaction_id
           JOIN comptes c ON c.id = t.compte_id
          WHERE tt.sens = ?
          ORDER BY t.date_transaction DESC, t.id DESC
          LIMIT 8`,
        [sens],
      )
    const encaissements = await derniers('encaissement')
    const decaissements = await derniers('decaissement')

    // --- Agenda de la semaine (lundi → vendredi)
    const monday = mondayOf(t)
    const events = await query(
      `SELECT id, titre, description, date_evenement AS date, montant, type, transaction_id AS transactionId
         FROM agenda WHERE date_evenement >= ? AND date_evenement <= ? ORDER BY date_evenement, id`,
      [monday, addDays(monday, 4)],
    )
    const semaine = JOURS.map((jour, i) => {
      const iso = addDays(monday, i)
      return {
        jour,
        iso,
        date: Number(iso.slice(8, 10)),
        events: events.filter((e) => e.date === iso).map((e) => ({ id: e.id, titre: e.titre, note: e.description, montant: e.montant, type: e.type, regle: e.transactionId !== null })),
      }
    })

    // --- Épargne du mois (taux modifiable dans « parametres ») et prévision
    const param = async (cle, fallback) => Number((await queryOne('SELECT valeur FROM parametres WHERE cle = ?', [cle]))?.valeur ?? fallback)
    const taux = await param('taux_epargne', 30)
    const objectif = await param('objectif_mensuel', 0)

    const flows = await query(
      `SELECT tt.sens AS sens, tt.code AS code, FLOOR((DAY(t.date_transaction) - 1) / 7) AS tranche, SUM(t.montant) AS total
         FROM transactions t JOIN types_transaction tt ON tt.id = t.type_transaction_id
        WHERE DATE(t.date_transaction) >= ? AND DATE(t.date_transaction) <= ?
        GROUP BY tt.sens, tt.code, tranche`,
      [mStart, t],
    )
    const signed = (f) => (f.sens === 'encaissement' ? f.total : f.code === 'epargne' ? 0 : -f.total) // l'épargne n'est pas une charge
    const benefice = flows.reduce((s, f) => s + signed(f), 0)
    const montant = Math.max(0, Math.round((benefice * taux) / 100))
    const semaines = [0, 1, 2, 3].map((i) => ({
      label: `S${i + 1}`,
      v: Math.max(0, Math.round((flows.filter((f) => Math.min(f.tranche, 3) === i).reduce((s, f) => s + signed(f), 0) * taux) / 100)),
    }))

    const attendu =
      (
        await queryOne('SELECT COALESCE(SUM(reste), 0) AS n FROM v_factures WHERE reste > 0 AND date_limite BETWEEN ? AND ?', [t, mEnd])
      ).n
    const engage = (
      await queryOne(
        `SELECT COALESCE(SUM(montant), 0) AS n FROM agenda
          WHERE type = 'engagement' AND transaction_id IS NULL AND montant IS NOT NULL
            AND date_evenement BETWEEN ? AND ? AND LOWER(titre) NOT LIKE '%pargne%'`,
        [t, mEnd],
      )
    ).n
    const projection = benefice + attendu - engage
    const atteint = objectif > 0 ? Math.max(0, Math.min(150, Math.round((projection / objectif) * 100))) : 0

    return {
      comptes,
      total,
      encaissements,
      decaissements,
      agenda: { semaine },
      epargne: { benefice, taux, montant, semaines, prevision: { objectif, projection, atteint, bon: atteint >= 80 } },
    }
  }),
)

// ----- Agenda : renseigner un programme pour une date (double-clic sur un jour), le supprimer
// Rendez-vous et rappels n'ont pas de montant ; un engagement a le sien (il compte dans la prévision d'épargne).
const NewProgramme = z
  .object({
    titre: z.string().trim().min(2).max(200),
    description: z.string().trim().max(255).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(['rendez_vous', 'rappel', 'engagement']),
    montant: z.number().int().min(1).max(10_000_000_000).optional(),
  })
  .refine((v) => v.type !== 'engagement' || v.montant, { path: ['montant'], message: 'Montant requis' })
  .refine((v) => !Number.isNaN(Date.parse(`${v.date}T00:00:00Z`)), { path: ['date'], message: 'Date invalide' })

router.post(
  '/agenda',
  asyncJson(async (req, res) => {
    const parsed = NewProgramme.safeParse(req.body)
    if (!parsed.success) {
      res.status(400)
      return { error: 'Informations invalides : vérifiez les champs' }
    }
    const v = parsed.data
    const ins = await query(
      'INSERT INTO agenda (titre, description, date_evenement, type, montant, employe_id) VALUES (?, ?, ?, ?, ?, ?)',
      [v.titre, v.description || null, v.date, v.type, v.type === 'engagement' ? v.montant : null, req.user.id],
    )
    res.status(201)
    return { id: ins.insertId }
  }),
)

router.delete(
  '/agenda/:id',
  asyncJson(async (req, res) => {
    const id = toId(req.params.id)
    const row = id ? await queryOne('SELECT id, transaction_id AS transactionId FROM agenda WHERE id = ?', [id]) : null
    if (!row) {
      res.status(404)
      return { error: 'Programme introuvable' }
    }
    if (row.transactionId !== null) {
      res.status(400)
      return { error: 'Cet engagement est déjà réglé : il ne peut plus être supprimé' }
    }
    await query('DELETE FROM agenda WHERE id = ?', [id])
    return { ok: true }
  }),
)

// ----- Historique de toutes les transactions (entrées et sorties, tous comptes), 15 par page
const HISTO_SIZE = 15
const one = (v) => (typeof v === 'string' ? v : '')

router.get(
  '/historique',
  asyncJson(async (req) => {
    const compte = ['caisse', 'banque', 'mobile'].includes(one(req.query.compte)) ? one(req.query.compte) : ''
    const sens = ['encaissement', 'decaissement'].includes(one(req.query.sens)) ? one(req.query.sens) : ''
    const q = one(req.query.q).trim().slice(0, 80)

    const where = []
    const params = []
    if (compte) {
      where.push('c.code = ?')
      params.push(compte)
    }
    if (sens) {
      where.push('tt.sens = ?')
      params.push(sens)
    }
    if (q) {
      where.push('t.libelle LIKE ?')
      params.push(`%${q}%`)
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const from = `FROM transactions t
         JOIN types_transaction tt ON tt.id = t.type_transaction_id
         JOIN comptes c ON c.id = t.compte_id
         LEFT JOIN employes e ON e.id = t.created_by
         LEFT JOIN factures f ON f.id = t.facture_id
         LEFT JOIN projet_services ps ON ps.id = t.projet_service_id
         LEFT JOIN projets pr ON pr.id = ps.projet_id`

    const sums = await queryOne(
      `SELECT COUNT(*) AS n,
              COALESCE(SUM(CASE tt.sens WHEN 'encaissement' THEN t.montant ELSE 0 END), 0) AS entrees,
              COALESCE(SUM(CASE tt.sens WHEN 'decaissement' THEN t.montant ELSE 0 END), 0) AS sorties
         ${from} ${filter}`,
      params,
    )
    const pages = Math.max(1, Math.ceil(sums.n / HISTO_SIZE))
    const asked = Number.parseInt(one(req.query.page), 10)
    const page = Math.min(Math.max(Number.isInteger(asked) ? asked : 1, 1), pages)
    const offset = (page - 1) * HISTO_SIZE // entiers calculés ici : sûrs à écrire dans la requête

    const rows = await query(
      `SELECT t.id AS id, t.date_transaction AS date, t.libelle AS libelle, t.montant AS montant,
              tt.libelle AS type, tt.sens AS sens, c.code AS compte, c.libelle AS compteNom, e.nom AS par,
              COALESCE(f.numero, CASE WHEN t.approvisionnement_id IS NOT NULL THEN CONCAT('AP', LPAD(t.approvisionnement_id, 4, '0')) END, pr.reference) AS origine
         ${from} ${filter}
        ORDER BY t.date_transaction DESC, t.id DESC
        LIMIT ${HISTO_SIZE} OFFSET ${offset}`,
      params,
    )
    return { transactions: rows, page, pages, total: sums.n, size: HISTO_SIZE, entrees: sums.entrees, sorties: sums.sorties }
  }),
)

export default router
