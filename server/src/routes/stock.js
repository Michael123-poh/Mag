import { Router } from 'express'
import { z } from 'zod'
import { pool, query, queryOne } from '../db.js'
import { addDays, addMonths, asyncJson, daysBetween, today } from '../util.js'

const router = Router()
const round2 = (n) => Math.round(n * 100) / 100

const DATES = ['semaine', 'mois', '3m', '6m', '1a']
const PALIERS = ['10', '20', '50', '70', '100'] // en milliers de xaf
const one = (v) => (typeof v === 'string' ? v : '')

// Une commande = une ligne de « approvisionnements ». Tout ce qui s'y rapporte lui est rattaché :
//   les arrivées de marchandise = mouvements_stock.approvisionnement_id  (peuvent être plusieurs : livraison en plusieurs fois)
//   les versements d'argent     = transactions.approvisionnement_id      (peuvent être plusieurs : acompte puis solde)
const refOf = (id) => `AP${String(id).padStart(4, '0')}`
const paiementOf = (paye, total) => (total > 0 && paye >= total ? 'paye' : paye > 0 ? 'acompte' : 'non_paye')
const receptionOf = (recueBase, commandeBase) => (recueBase >= commandeBase ? 'recu' : recueBase > 0 ? 'partiel' : 'non_recu')

// Début de la fenêtre « dernière livraison »
function dateFrom(code, t) {
  if (code === 'semaine') return addDays(t, -7)
  return addMonths(t, code === 'mois' ? -1 : code === '3m' ? -3 : code === '6m' ? -6 : -12)
}

router.get(
  '/',
  asyncJson(async (req) => {
    const t = today()
    const q = one(req.query.q).trim().toLowerCase().slice(0, 80)
    const date = DATES.includes(one(req.query.date)) ? one(req.query.date) : ''
    const solde = PALIERS.includes(one(req.query.solde)) ? Number(req.query.solde) * 1000 : null

    const stocks = await query(
      `SELECT s.id AS id, s.code AS code, s.nom AS nom, s.unite AS unite, s.seuil_alerte AS seuil,
              s.conditionnement AS conditionnement, s.quantite_affichee AS qte, f.nom AS fournisseur
         FROM v_stocks s LEFT JOIN fournisseurs f ON f.id = s.fournisseur_id
        ORDER BY s.code`,
    )
    const appros = await query(
      `SELECT a.id AS id, a.stock_id AS stockId, a.quantite AS quantite, a.prix_unitaire AS prix,
              a.date_livraison AS date,
              COALESCE((SELECT SUM(tr.montant) FROM transactions tr WHERE tr.approvisionnement_id = a.id), 0) AS paye,
              COALESCE((SELECT SUM(m.delta) FROM mouvements_stock m WHERE m.approvisionnement_id = a.id), 0) AS recueBase
         FROM approvisionnements a ORDER BY a.date_livraison DESC, a.id DESC`,
    )
    const machines = await query(
      `SELECT ms.stock_id AS stockId, m.nom AS nom
         FROM machine_stocks ms JOIN machines m ON m.id = ms.machine_id ORDER BY m.nom`,
    )

    const liste = stocks.map((s) => {
        const mine = appros.filter((a) => a.stockId === s.id) // du plus récent au plus ancien
        const last = mine[0]
        const total = last ? last.quantite * last.prix : 0
        const paye = last ? last.paye >= total : true

        // Réception de la dernière livraison (indépendante du paiement) : reçu · en partie · non reçu.
        // Les mouvements sont comptés en unité de base ; la commande est en unité affichée (× conditionnement).
        const recueBase = last ? Number(last.recueBase) : 0
        const commandeBase = last ? last.quantite * s.conditionnement : 0
        const reception = last ? receptionOf(recueBase, commandeBase) : 'recu'
        const recue = last ? round2(recueBase / s.conditionnement) : 0
        const reglement = !last || paye ? { type: 'Solde', montant: 0 } : last.paye > 0 ? { type: 'Acompte', montant: last.paye } : { type: 'Solde', montant: total }

        // durée moyenne entre deux livraisons
        let duree = null
        const arrivees = mine.filter((a) => Number(a.recueBase) > 0)
        if (arrivees.length > 1) {
          const gaps = arrivees.slice(0, -1).map((a, i) => daysBetween(arrivees[i + 1].date, a.date))
          duree = Math.round(gaps.reduce((x, y) => x + y, 0) / gaps.length)
        }

        return {
          id: s.id,
          code: s.code,
          nom: s.nom,
          fournisseur: s.fournisseur ?? '—',
          unite: s.unite,
          qte: round2(s.qte),
          seuil: round2(s.seuil / s.conditionnement),
          prix: last?.prix ?? null,
          livraison: last?.date ?? null,
          paye,
          paiement: last ? paiementOf(last.paye, total) : 'paye',
          recu: reception,
          detail: last
            ? {
                arrivee: { qte: recue, date: last.date },
                // Les deux statuts de la dernière livraison : l'argent (payé / non payé) et la marchandise (reçu / en partie / non reçu)
                statuts: {
                  paiement: { code: paiementOf(last.paye, total), paye: last.paye, total },
                  reception: { code: reception, recue, commandee: last.quantite },
                },
                actuelle: { qte: round2(s.qte), du: arrivees[0]?.date ?? null, au: t }, // depuis la dernière livraison réellement reçue
                machines: machines.filter((m) => m.stockId === s.id).map((m) => m.nom),
                prixAchat: total,
                reglement,
                duree,
              }
            : null,
          resteAPayer: last ? Math.max(0, total - last.paye) : 0,
        }
      })

    // Filtres : recherche (nom, code, fournisseur), dernière livraison, reste à payer sur cette livraison
    const filtres = liste.filter((s) => {
      if (q && !`${s.nom} ${s.code} ${s.fournisseur}`.toLowerCase().includes(q)) return false
      if (date && !(s.livraison && s.livraison >= dateFrom(date, t))) return false
      if (solde !== null && !(s.resteAPayer > solde)) return false
      return true
    })

    return { stocks: filtres }
  }),
)

// Un versement = un décaissement « Achat de consommables », rattaché à la commande, avec son détail dans le libellé
// (genre : Paiement · Acompte · Versement · Solde).
async function versement(conn, { approId, produit, fournisseur, montant, compte, genre, userId }) {
  const c = await queryOne('SELECT id FROM comptes WHERE code = ?', [compte])
  const type = await queryOne("SELECT id FROM types_transaction WHERE code = 'achat_stock'")
  if (!c || !type) throw new Error('Compte ou type de transaction manquant')
  const libelle = `${genre} achat stock · ${refOf(approId)} · ${produit.nom} · ${fournisseur}`.slice(0, 200)
  await conn.execute(
    'INSERT INTO transactions (type_transaction_id, compte_id, montant, libelle, approvisionnement_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [type.id, c.id, montant, libelle, approId, userId],
  )
}

// ------------------------------------------------------------------ commandes d'un produit (fiche produit)
// Chaque commande avec ses deux statuts, et le détail : arrivées de marchandise et versements d'argent.
router.get('/:id/commandes', async (req, res, next) => {
  try {
    const stockId = Number(req.params.id)
    if (!Number.isInteger(stockId) || stockId < 1) return res.status(400).json({ error: 'Identifiant invalide' })
    const produit = await queryOne('SELECT id, unite, conditionnement FROM stocks WHERE id = ?', [stockId])
    if (!produit) return res.status(404).json({ error: 'Produit introuvable' })

    const commandes = await query(
      `SELECT a.id AS id, a.quantite AS quantite, a.prix_unitaire AS prix, a.date_livraison AS date, f.nom AS fournisseur
         FROM approvisionnements a JOIN fournisseurs f ON f.id = a.fournisseur_id
        WHERE a.stock_id = ? ORDER BY a.date_livraison DESC, a.id DESC LIMIT 20`,
      [stockId],
    )
    if (commandes.length === 0) return res.json({ unite: produit.unite, commandes: [] })
    const ids = commandes.map((c) => c.id)
    const marks = ids.map(() => '?').join(',')

    const arrivees = await query(
      `SELECT m.id AS id, m.approvisionnement_id AS aid, m.delta AS delta, m.date_mouvement AS date, e.nom AS par
         FROM mouvements_stock m LEFT JOIN employes e ON e.id = m.employe_id
        WHERE m.source = 'approvisionnement' AND m.approvisionnement_id IN (${marks}) ORDER BY m.date_mouvement, m.id`,
      ids,
    )
    const versements = await query(
      `SELECT t.id AS id, t.approvisionnement_id AS aid, t.montant AS montant, t.date_transaction AS date, t.libelle AS libelle,
              c.libelle AS compte, e.nom AS par
         FROM transactions t JOIN comptes c ON c.id = t.compte_id LEFT JOIN employes e ON e.id = t.created_by
        WHERE t.approvisionnement_id IN (${marks}) ORDER BY t.date_transaction, t.id`,
      ids,
    )

    res.json({
      unite: produit.unite,
      commandes: commandes.map((c) => {
        const mes = arrivees.filter((x) => x.aid === c.id)
        const mesVersements = versements.filter((x) => x.aid === c.id)
        const recueBase = mes.reduce((n, x) => n + x.delta, 0)
        const total = c.quantite * c.prix
        const paye = mesVersements.reduce((n, x) => n + x.montant, 0)
        return {
          id: c.id,
          ref: refOf(c.id),
          date: c.date,
          fournisseur: c.fournisseur,
          quantite: c.quantite,
          recue: round2(recueBase / produit.conditionnement),
          prix: c.prix,
          total,
          paye,
          reception: receptionOf(recueBase, c.quantite * produit.conditionnement),
          paiement: paiementOf(paye, total),
          arrivees: mes.map((x) => ({ id: x.id, date: x.date, qte: round2(x.delta / produit.conditionnement), par: x.par })),
          versements: mesVersements.map((x) => ({ id: x.id, date: x.date, montant: x.montant, compte: x.compte, par: x.par, libelle: x.libelle })),
        }
      }),
    })
  } catch (err) {
    next(err)
  }
})

// Régulariser une commande : enregistrer une arrivée de marchandise, ou un versement d'argent.
// La commande est verrouillée le temps du calcul : deux personnes qui régularisent en même temps ne dépassent jamais le reste.
async function onOrder(req, res, next, apply) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identifiant invalide' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[order]] = await conn.execute(
      `SELECT a.id AS id, a.stock_id AS stockId, a.quantite AS quantite, a.prix_unitaire AS prix, s.nom AS nom, s.code AS code,
              s.conditionnement AS cond, f.nom AS fournisseur
         FROM approvisionnements a JOIN stocks s ON s.id = a.stock_id JOIN fournisseurs f ON f.id = a.fournisseur_id
        WHERE a.id = ? FOR UPDATE`,
      [id],
    )
    if (!order) {
      await conn.rollback()
      return res.status(404).json({ error: 'Commande introuvable' })
    }
    const error = await apply(conn, order)
    if (error) {
      await conn.rollback()
      return res.status(400).json({ error })
    }
    await conn.commit()
    res.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
}

router.post('/commandes/:id/reception', (req, res, next) => {
  const parsed = z.object({ quantite: z.number().int().min(1).max(1_000_000) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Quantité invalide' })
  onOrder(req, res, next, async (conn, o) => {
    const [[row]] = await conn.execute("SELECT COALESCE(SUM(delta), 0) AS recue FROM mouvements_stock WHERE approvisionnement_id = ? AND source = 'approvisionnement'", [o.id])
    const reste = o.quantite * o.cond - Number(row.recue)
    const base = parsed.data.quantite * o.cond
    if (reste <= 0) return 'Cette commande est déjà entièrement reçue'
    if (base > reste) return `Il ne reste que ${round2(reste / o.cond)} à recevoir sur cette commande`
    await conn.execute("INSERT INTO mouvements_stock (stock_id, delta, source, approvisionnement_id, employe_id) VALUES (?, ?, 'approvisionnement', ?, ?)", [o.stockId, base, o.id, req.user.id])
    return null
  })
})

router.post('/commandes/:id/versement', (req, res, next) => {
  const parsed = z.object({ montant: z.number().int().min(1).max(10_000_000_000), compte: z.enum(['caisse', 'banque', 'mobile']) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Versement invalide' })
  onOrder(req, res, next, async (conn, o) => {
    const [[row]] = await conn.execute('SELECT COALESCE(SUM(montant), 0) AS paye, COUNT(*) AS n FROM transactions WHERE approvisionnement_id = ?', [o.id])
    const reste = o.quantite * o.prix - Number(row.paye)
    if (reste <= 0) return 'Cette commande est déjà entièrement payée'
    if (parsed.data.montant > reste) return `Il ne reste que ${reste} xaf à payer sur cette commande`
    const solde = parsed.data.montant === reste
    await versement(conn, {
      approId: o.id,
      produit: { nom: o.nom },
      fournisseur: o.fournisseur,
      montant: parsed.data.montant,
      compte: parsed.data.compte,
      genre: solde ? (row.n > 0 ? 'Solde' : 'Paiement') : row.n > 0 ? 'Versement' : 'Acompte',
      userId: req.user.id,
    })
    return null
  })
})

// ------------------------------------------------------------------ formulaire « Entrée de stock »
router.get(
  '/options',
  asyncJson(async () => {
    const produits = await query(
      `SELECT s.id AS id, s.code AS code, s.nom AS nom, s.unite AS unite, s.fournisseur_id AS fournisseurId,
              (SELECT a.prix_unitaire FROM approvisionnements a WHERE a.stock_id = s.id ORDER BY a.date_livraison DESC, a.id DESC LIMIT 1) AS prix
         FROM stocks s ORDER BY s.nom`,
    )
    const fournisseurs = await query('SELECT id, nom FROM fournisseurs ORDER BY nom')
    const comptes = await query('SELECT code, libelle FROM comptes ORDER BY id')
    return { produits: produits.map((p) => ({ ...p, prix: p.prix === null ? null : Number(p.prix) })), fournisseurs, comptes }
  }),
)

// Deux statuts qui ne dépendent pas l'un de l'autre :
//   paiement  (argent)       : paye | non_paye          -> « payé » enregistre un décaissement dans la caisse
//   réception (marchandise)  : recu | partiel | non_recu -> seule la quantité reçue entre dans le stock
const NewEntree = z
  .object({
    stock_id: z.number().int().positive(),
    fournisseur_id: z.number().int().positive(),
    quantite: z.number().int().min(1).max(1_000_000),
    prix_unitaire: z.number().int().min(1).max(1_000_000_000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reception: z.enum(['recu', 'partiel', 'non_recu']),
    quantite_recue: z.number().int().min(1).max(1_000_000).optional(),
    paiement: z.enum(['paye', 'acompte', 'non_paye']),
    montant_verse: z.number().int().min(1).max(10_000_000_000).optional(), // acompte : somme versée à la commande
    compte: z.enum(['caisse', 'banque', 'mobile']).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.reception === 'partiel' && !(v.quantite_recue && v.quantite_recue < v.quantite)) {
      ctx.addIssue({ code: 'custom', path: ['quantite_recue'], message: 'La quantité reçue doit être inférieure à la quantité commandée' })
    }
    if (v.paiement !== 'non_paye' && !v.compte) ctx.addIssue({ code: 'custom', path: ['compte'], message: 'Compte requis' })
    if (v.paiement === 'acompte' && !(v.montant_verse && v.montant_verse < v.quantite * v.prix_unitaire)) {
      ctx.addIssue({ code: 'custom', path: ['montant_verse'], message: "L'acompte doit être inférieur au total" })
    }
  })

router.post('/', async (req, res, next) => {
  try {
    const parsed = NewEntree.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Informations invalides : vérifiez les champs' })
    const v = parsed.data

    const produit = await queryOne('SELECT id, code, nom, conditionnement FROM stocks WHERE id = ?', [v.stock_id])
    if (!produit) return res.status(400).json({ error: 'Produit introuvable' })
    const fournisseur = await queryOne('SELECT id, nom FROM fournisseurs WHERE id = ?', [v.fournisseur_id])
    if (!fournisseur) return res.status(400).json({ error: 'Fournisseur introuvable' })

    const recue = v.reception === 'recu' ? v.quantite : v.reception === 'partiel' ? v.quantite_recue : 0
    const total = v.quantite * v.prix_unitaire

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [ins] = await conn.execute(
        'INSERT INTO approvisionnements (stock_id, fournisseur_id, quantite, prix_unitaire, date_livraison) VALUES (?, ?, ?, ?, ?)',
        [v.stock_id, v.fournisseur_id, v.quantite, v.prix_unitaire, v.date],
      )
      if (recue > 0) {
        await conn.execute(
          "INSERT INTO mouvements_stock (stock_id, delta, source, approvisionnement_id, employe_id) VALUES (?, ?, 'approvisionnement', ?, ?)",
          [v.stock_id, recue * produit.conditionnement, ins.insertId, req.user.id],
        )
      }
      if (v.paiement !== 'non_paye') {
        const montant = v.paiement === 'paye' ? total : v.montant_verse
        await versement(conn, { approId: ins.insertId, produit, fournisseur: fournisseur.nom, montant, compte: v.compte, genre: v.paiement === 'paye' ? 'Paiement' : 'Acompte', userId: req.user.id })
      }
      await conn.commit()
      res.status(201).json({ id: ins.insertId, code: produit.code, total })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (err) {
    next(err)
  }
})

export default router
