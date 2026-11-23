import { Router } from 'express'
import { z } from 'zod'
import { loadCards } from '../cards.js'
import { pool, query, queryOne } from '../db.js'
import { addMonths, asyncJson, monthStart, toId, today } from '../util.js'

const router = Router()

// Valeurs acceptées pour chaque filtre (tout le reste est ignoré)
const TYPES = { impression: 'Impression', photocopie: 'Photocopie', saisie: 'Saisie', 'mise-en-page': 'Mise en page' }
const PRODUCTION = { livre: 'livre', encours: 'en_cours', afaire: 'a_faire' }
const REGLEMENT = ['paye', 'acompte', 'non-paye']
const PERIODE = ['ce-mois', '3m', '6m', '1a']

const one = (v) => (typeof v === 'string' ? v : '')

// Paiement de la facture liée à la prestation, en code numérique : 2 = payée, 1 = acompte, 0 = impayée, NULL = pas encore facturée
// (comparaison sur des nombres : indépendante des collations MySQL)
const PAIEMENT_SQL = `(SELECT CASE WHEN vf.total > 0 AND vf.encaisse >= vf.total THEN 2 WHEN vf.encaisse > 0 THEN 1 ELSE 0 END
                         FROM lignes_facture l JOIN v_factures vf ON vf.id = l.facture_id
                        WHERE l.prestation_id = p.id ORDER BY vf.id DESC LIMIT 1)`
const PAIEMENT_NOM = { 2: 'payee', 1: 'partielle', 0: 'impayee' }

// Filtre enregistré d'une carte -> paramètres du même format que l'URL
const toParams = (f) => ({
  type: f.type ?? '',
  production: f.production ?? '',
  periode: f.periode ?? '',
  reglement: f.reglement ?? '',
})

// Construit le WHERE (et ses paramètres) à partir des filtres
function buildFilter(p, t) {
  const q = one(p.q).trim().slice(0, 80)
  const type = TYPES[one(p.type)]
  const production = PRODUCTION[one(p.production)]
  const reglement = REGLEMENT.includes(one(p.reglement)) ? one(p.reglement) : ''
  const periode = PERIODE.includes(one(p.periode)) ? one(p.periode) : ''

  const where = []
  const params = []
  if (q) {
    where.push('(p.titre LIKE ? OR p.reference LIKE ? OR c.nom LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (type) {
    where.push('tp.libelle = ?')
    params.push(type)
  }
  if (production) {
    where.push('p.statut_production = ?')
    params.push(production)
  }
  if (reglement === 'paye') where.push(`${PAIEMENT_SQL} = 2`)
  if (reglement === 'acompte') where.push(`${PAIEMENT_SQL} = 1`)
  if (reglement === 'non-paye') where.push(`(${PAIEMENT_SQL} = 0 OR ${PAIEMENT_SQL} IS NULL)`)
  if (periode) {
    const from = periode === 'ce-mois' ? monthStart(t) : addMonths(monthStart(t), periode === '3m' ? -3 : periode === '6m' ? -6 : -12)
    where.push('DATE(p.created_at) >= ?')
    params.push(from)
  }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}

const FROM = `FROM prestations p
         JOIN clients c ON c.id = p.client_id
         JOIN types_prestation tp ON tp.id = p.type_prestation_id`

// ----- Création d'une prestation (formulaire en plusieurs parties) -----------------------------------
// Trois services : photocopie (prix de la page), mise en page (pages x prix) et impression (lignes de la grille des tarifs).
const SERVICES = { photocopie: 'Photocopie', 'mise-en-page': 'Mise en page', impression: 'Impression' }
const COULEURS = ['N/B', 'Quadri']
const FORMATS = ['A4', 'A3']
const TIRAGES = ['Recto', 'Recto/Verso']
const PRIX_PHOTOCOPIE_DEFAUT = 50 // xaf la page, si la grille n'a pas de ligne PHO-PAGE

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const commun = {
  client_id: z.number().int().positive(),
  titre: z.string().trim().min(2).max(200),
  date_livraison: date,
  notes: z.string().trim().max(1000).optional().default(''),
}
const NewPrestation = z.discriminatedUnion('service', [
  z.object({
    ...commun,
    service: z.literal('photocopie'),
    pages: z.number().int().min(1).max(1_000_000),
    couleur: z.enum(COULEURS),
    format: z.enum(FORMATS),
    tirage: z.enum(TIRAGES),
  }),
  z.object({
    ...commun,
    service: z.literal('mise-en-page'),
    pages: z.number().int().min(1).max(100_000),
    prix_page: z.number().int().min(1).max(100_000_000),
  }),
  z.object({
    ...commun,
    service: z.literal('impression'),
    lignes: z
      .array(
        z.object({
          tarif_id: z.number().int().positive(),
          quantite: z.number().int().min(1).max(1_000_000),
          prix: z.number().int().min(0).max(100_000_000).optional(), // prix unitaire modifié par l'employé (sinon : prix de la grille)
        }),
      )
      .min(1)
      .max(30),
  }),
])

async function prixPhotocopie() {
  const row = await queryOne("SELECT prix_unitaire AS prix FROM tarifs WHERE reference = 'PHO-PAGE' AND actif = 1")
  return row?.prix ?? PRIX_PHOTOCOPIE_DEFAUT
}

// Listes et prix proposés par le formulaire (les prix viennent de la grille, jamais du navigateur)
router.get(
  '/options',
  asyncJson(async () => {
    const tarifs = await query(
      `SELECT id, reference, libelle, famille, format_page AS format, couleur_face AS couleur,
              support_finition AS support, prix_unitaire AS prix
         FROM tarifs WHERE actif = 1 AND famille <> 'Photocopie' ORDER BY id`,
    )
    return {
      services: Object.entries(SERVICES).map(([value, label]) => ({ value, label })),
      photocopie: { prix: await prixPhotocopie(), couleurs: COULEURS, formats: FORMATS, tirages: TIRAGES },
      tarifs,
    }
  }),
)

// Recherche d'un client par son nom : les noms les plus proches de ce qui est tapé d'abord
router.get(
  '/clients',
  asyncJson(async (req) => {
    const words = String(typeof req.query.q === 'string' ? req.query.q : '')
      .trim()
      .slice(0, 80)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
    const where = words.map(() => '(c.nom LIKE ? OR c.code LIKE ?)').join(' AND ')
    const params = words.flatMap((w) => [`%${w}%`, `%${w}%`])
    return query(
      `SELECT c.id AS id, c.code AS code, c.nom AS nom, c.ville AS ville
         FROM clients c
        ${where ? `WHERE ${where}` : ''}
        ORDER BY ${words.length ? 'COALESCE(NULLIF(LOCATE(?, c.nom), 0), 999), ' : ''}c.updated_at DESC, c.nom
        LIMIT 8`,
      words.length ? [...params, words[0]] : [],
    )
  }),
)

const isDuplicate = (err) => err?.code === 'ER_DUP_ENTRY'

router.post('/', async (req, res, next) => {
  try {
    const parsed = NewPrestation.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Informations invalides : vérifiez les champs' })
    const p = parsed.data

    if (!(await queryOne('SELECT id FROM clients WHERE id = ?', [p.client_id]))) {
      return res.status(400).json({ error: 'Client introuvable' })
    }
    const type = await queryOne('SELECT id FROM types_prestation WHERE libelle = ?', [SERVICES[p.service]])

    // Lignes de la prestation, avec les prix de la grille
    let lignes
    let resume
    let quantite
    if (p.service === 'photocopie') {
      const prix = await prixPhotocopie()
      lignes = [
        {
          tarif_id: null,
          libelle: `Photocopie ${p.format} - ${p.couleur} - ${p.tirage}`,
          couleur: p.couleur,
          format: p.format,
          tirage: p.tirage,
          quantite: p.pages,
          prix,
        },
      ]
      resume = `${p.pages} pages · ${p.couleur} · ${p.format} · ${p.tirage}`
      quantite = p.pages
    } else if (p.service === 'mise-en-page') {
      lignes = [{ tarif_id: null, libelle: 'Mise en page', couleur: null, format: null, tirage: null, quantite: p.pages, prix: p.prix_page }]
      resume = `${p.pages} pages`
      quantite = p.pages
    } else {
      const ids = [...new Set(p.lignes.map((l) => l.tarif_id))]
      const rows = await query(
        `SELECT id, libelle, prix_unitaire AS prix FROM tarifs
          WHERE actif = 1 AND famille <> 'Photocopie' AND id IN (${ids.map(() => '?').join(',')})`,
        ids,
      )
      if (rows.length !== ids.length) return res.status(400).json({ error: 'Un des produits choisis n\'existe plus dans la grille des tarifs' })
      // prix de la grille, sauf si l'employé l'a modifié ; même produit au même prix = une seule ligne
      const byKey = new Map()
      for (const l of p.lignes) {
        const row = rows.find((r) => r.id === l.tarif_id)
        const prix = l.prix ?? row.prix
        const key = `${row.id}@${prix}`
        const line = byKey.get(key) ?? { tarif_id: row.id, libelle: row.libelle, couleur: null, format: null, tirage: null, quantite: 0, prix }
        line.quantite += l.quantite
        byKey.set(key, line)
      }
      lignes = [...byKey.values()]
      resume = lignes.map((l) => `${l.quantite} × ${l.libelle}`).join(' ; ')
      quantite = lignes.reduce((n, l) => n + l.quantite, 0)
    }
    const total = lignes.reduce((n, l) => n + l.quantite * l.prix, 0)
    const details = (p.notes ? `${resume} — ${p.notes}` : resume).slice(0, 5000)
    const yy = today().slice(2, 4)

    // Numéro du bon (ex. BP101RT26) : le suivant de la série ; on réessaie si deux bons sont créés en même temps
    const conn = await pool.getConnection()
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          await conn.beginTransaction()
          const [[last]] = await conn.execute(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(reference, 3, 3) AS UNSIGNED)), 0) AS n FROM prestations WHERE reference LIKE 'BP___RT__'",
          )
          const reference = `BP${String(last.n + 1).padStart(3, '0')}RT${yy}`
          const [ins] = await conn.execute(
            `INSERT INTO prestations (reference, client_id, type_prestation_id, responsable_id, titre, details, quantite, tarif, statut_production, date_echeance)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'a_faire', ?)`,
            [reference, p.client_id, type.id, req.user.id, p.titre, details, quantite, total, p.date_livraison],
          )
          for (const l of lignes) {
            await conn.execute(
              `INSERT INTO prestation_lignes (prestation_id, tarif_id, libelle, couleur, format_page, tirage, quantite, prix_unitaire, total)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [ins.insertId, l.tarif_id, l.libelle, l.couleur, l.format, l.tirage, l.quantite, l.prix, l.quantite * l.prix],
            )
          }
          await conn.commit()
          return res.status(201).json({ id: ins.insertId, reference, total })
        } catch (err) {
          await conn.rollback()
          if (!isDuplicate(err) || attempt >= 4) throw err
        }
      }
    } finally {
      conn.release()
    }
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Tables manquantes : exécutez database/migration_prestation.sql puis database/tarifs.sql' })
    }
    next(err)
  }
})

// ----- Fiche d'une prestation (fenêtre ouverte au clic sur une ligne de la liste) ----------------------
const STATUTS = ['a_faire', 'en_cours', 'livre']

router.get(
  '/:id',
  asyncJson(async (req, res) => {
    const id = toId(req.params.id)
    const p = id
      ? await queryOne(
          `SELECT p.id AS id, p.reference AS reference, p.titre AS titre, p.details AS details, p.quantite AS quantite,
                  p.tarif AS tarif, p.statut_production AS statut, p.date_echeance AS echeance,
                  p.date_livraison AS livraison, p.created_at AS cree, tp.libelle AS service,
                  c.id AS client_id, c.nom AS client, c.code AS client_code, c.telephone AS telephone,
                  e.nom AS responsable, ${PAIEMENT_SQL} AS paiement
             FROM prestations p
             JOIN clients c ON c.id = p.client_id
             JOIN types_prestation tp ON tp.id = p.type_prestation_id
             LEFT JOIN employes e ON e.id = p.responsable_id
            WHERE p.id = ?`,
          [id],
        )
      : null
    if (!p) {
      res.status(404)
      return { error: 'Prestation introuvable' }
    }

    // Lignes de la commande (absentes des prestations saisies avant la création par formulaire)
    let lignes = []
    try {
      lignes = await query(
        `SELECT libelle, couleur, format_page AS format, tirage, quantite, prix_unitaire AS prix, total
           FROM prestation_lignes WHERE prestation_id = ? ORDER BY id`,
        [id],
      )
    } catch (err) {
      if (err?.code !== 'ER_NO_SUCH_TABLE') throw err
    }

    const facture = await queryOne(
      `SELECT vf.id AS id, vf.numero AS numero, vf.total AS total, vf.encaisse AS encaisse, vf.reste AS reste
         FROM lignes_facture l JOIN v_factures vf ON vf.id = l.facture_id
        WHERE l.prestation_id = ? ORDER BY vf.id DESC LIMIT 1`,
      [id],
    )
    // Versements déjà encaissés sur cette facture (date, somme, compte, qui)
    const versements = facture
      ? await query(
          `SELECT t.id AS id, t.date_transaction AS date, t.montant AS montant, t.libelle AS libelle, c.libelle AS compte, e.nom AS par
             FROM transactions t JOIN comptes c ON c.id = t.compte_id LEFT JOIN employes e ON e.id = t.created_by
            WHERE t.facture_id = ? ORDER BY t.date_transaction DESC, t.id DESC`,
          [facture.id],
        )
      : []

    // Pour une prestation créée par formulaire, « details » = résumé des lignes + « — » + informations diverses
    const notes = lignes.length ? (p.details?.includes(' — ') ? p.details.slice(p.details.indexOf(' — ') + 3) : '') : (p.details ?? '')

    return {
      id: p.id,
      reference: p.reference,
      titre: p.titre,
      service: p.service,
      statut: p.statut,
      tarif: p.tarif,
      echeance: p.echeance,
      livraison: p.livraison,
      cree: p.cree,
      responsable: p.responsable,
      paiement: PAIEMENT_NOM[p.paiement] ?? 'non_facture',
      facture,
      versements,
      client: { id: p.client_id, nom: p.client, code: p.client_code, telephone: p.telephone },
      lignes,
      notes,
    }
  }),
)

// Encaisser un paiement depuis la fiche (le client paie au comptoir) : acompte, versement ou solde.
// Le paiement se rattache à la facture de la prestation ; s'il n'y en a pas encore, elle est créée (avec le prix de la prestation).
// L'encaissement crédite le compte choisi (Caisse, Banque ou Mobile) et apparaît dans l'historique de la caisse.
const Paiement = z.object({ montant: z.number().int().min(1).max(10_000_000_000), compte: z.enum(['caisse', 'banque', 'mobile']) })

router.post('/:id/paiement', async (req, res, next) => {
  const id = toId(req.params.id)
  const parsed = Paiement.safeParse(req.body)
  if (!id || !parsed.success) return res.status(400).json({ error: 'Paiement invalide' })
  const { montant, compte } = parsed.data
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // La prestation est verrouillée le temps du calcul : deux encaissements en même temps ne dépassent jamais le reste
    const [[p]] = await conn.execute(
      'SELECT id, client_id AS clientId, titre, tarif, date_echeance AS echeance FROM prestations WHERE id = ? FOR UPDATE',
      [id],
    )
    if (!p) {
      await conn.rollback()
      return res.status(404).json({ error: 'Prestation introuvable' })
    }

    let [[facture]] = await conn.execute(
      `SELECT vf.id AS id, vf.numero AS numero, vf.total AS total, vf.encaisse AS encaisse
         FROM lignes_facture l JOIN v_factures vf ON vf.id = l.facture_id
        WHERE l.prestation_id = ? ORDER BY vf.id DESC LIMIT 1`,
      [id],
    )
    if (!facture) {
      if (!(p.tarif > 0)) {
        await conn.rollback()
        return res.status(400).json({ error: 'Cette prestation n’a pas de prix : rien à encaisser' })
      }
      // Pas encore facturée : on crée la facture (numéro suivant de l'année) avec une ligne pour cette prestation
      const year = today().slice(0, 4)
      const [[last]] = await conn.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(numero, 9) AS UNSIGNED)), 0) AS n FROM factures WHERE numero LIKE ?", [`FA-${year}-%`])
      const numero = `FA-${year}-${String(last.n + 1).padStart(4, '0')}`
      const [ins] = await conn.execute(
        'INSERT INTO factures (numero, client_id, date_emission, date_limite, created_by) VALUES (?, ?, ?, ?, ?)',
        [numero, p.clientId, today(), p.echeance ?? today(), req.user.id],
      )
      await conn.execute('INSERT INTO lignes_facture (facture_id, prestation_id, description, montant) VALUES (?, ?, ?, ?)', [ins.insertId, id, p.titre.slice(0, 255), p.tarif])
      facture = { id: ins.insertId, numero, total: p.tarif, encaisse: 0 }
    }

    const reste = facture.total - facture.encaisse
    if (reste <= 0) {
      await conn.rollback()
      return res.status(400).json({ error: 'Cette prestation est déjà entièrement payée' })
    }
    if (montant > reste) {
      await conn.rollback()
      return res.status(400).json({ error: `Il ne reste que ${reste} xaf à payer` })
    }

    const c = await queryOne('SELECT id FROM comptes WHERE code = ?', [compte])
    const type = await queryOne("SELECT id FROM types_transaction WHERE code = 'paiement_facture'")
    if (!c || !type) throw new Error('Compte ou type de transaction manquant')
    const genre = montant === reste ? (facture.encaisse > 0 ? 'Solde' : 'Paiement') : facture.encaisse > 0 ? 'Versement' : 'Acompte'
    await conn.execute(
      'INSERT INTO transactions (type_transaction_id, compte_id, montant, libelle, facture_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [type.id, c.id, montant, `${genre} ${facture.numero}`, facture.id, req.user.id],
    )
    await conn.commit()
    res.json({ ok: true, facture: facture.numero })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

// Changement du statut de production : À faire, Encours ou Livré (la date de livraison suit). Une fois livrée, une prestation ne change plus.
router.patch('/:id/statut', async (req, res, next) => {
  try {
    const id = toId(req.params.id)
    const parsed = z.object({ statut: z.enum(STATUTS) }).safeParse(req.body)
    if (!id || !parsed.success) return res.status(400).json({ error: 'Statut invalide' })
    const { statut } = parsed.data

    const current = await queryOne('SELECT statut_production AS statut FROM prestations WHERE id = ?', [id])
    if (!current) return res.status(404).json({ error: 'Prestation introuvable' })
    // Livré est définitif
    if (current.statut === 'livre' && statut !== 'livre') {
      return res.status(409).json({ error: 'Cette prestation est livrée : son statut ne peut plus être modifié' })
    }
    // Livré : la date de livraison est celle d'aujourd'hui (si elle n'était pas déjà renseignée) ; sinon elle est effacée
    await query(
      `UPDATE prestations SET statut_production = ?,
              date_livraison = CASE WHEN ? = 'livre' THEN COALESCE(date_livraison, ?) ELSE NULL END
        WHERE id = ?`,
      [statut, statut, today(), id],
    )
    const row = await queryOne('SELECT statut_production AS statut, date_livraison AS livraison FROM prestations WHERE id = ?', [id])
    res.json(row)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/',
  asyncJson(async (req) => {
    const t = today()

    const { where, params } = buildFilter(req.query, t)
    const rows = await query(
      `SELECT p.id AS id, p.reference AS reference, p.titre AS titre, p.details AS details,
              p.tarif AS tarif, p.statut_production AS statut, p.date_echeance AS echeance, c.nom AS client,
              ${PAIEMENT_SQL} AS paiement
         ${FROM}
        ${where}
        ORDER BY p.date_echeance DESC, p.id DESC
        LIMIT 100`,
      params,
    )

    // Cartes « dossier » : filtre personnalisé de l'employé + nombre de prestations que ce filtre donne
    const cards = await loadCards(req.user.id, 'prestations')
    const folders = []
    for (const card of cards) {
      const f = buildFilter(toParams(card.filters), t)
      const n = await queryOne(`SELECT COUNT(*) AS n ${FROM} ${f.where}`, f.params)
      folders.push({ slot: card.slot, filters: card.filters, custom: card.custom, count: n.n })
    }

    return {
      folders,
      prestations: rows.map((r) => ({ ...r, paiement: PAIEMENT_NOM[r.paiement] ?? 'non_facture' })),
    }
  }),
)

export default router
