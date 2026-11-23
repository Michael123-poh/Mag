import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { addMonths, asyncJson, monthStart, today, toId, toneOf } from '../util.js'

const router = Router()
const STATUTS = ['payee', 'partielle', 'impayee']
const PERIODES = ['mois', '3m', '6m', '1a']

// Filtre par statut sur des nombres (encaissé / total) plutôt que sur le texte de la vue : indépendant des collations MySQL
const STATUT_SQL = {
  payee: 'vf.total > 0 AND vf.encaisse >= vf.total',
  partielle: 'vf.encaisse > 0 AND NOT (vf.total > 0 AND vf.encaisse >= vf.total)',
  impayee: 'vf.encaisse <= 0',
}

router.get(
  '/',
  asyncJson(async (req) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : ''
    const statut = typeof req.query.statut === 'string' && STATUTS.includes(req.query.statut) ? req.query.statut : ''

    const periode = typeof req.query.periode === 'string' && PERIODES.includes(req.query.periode) ? req.query.periode : ''

    const where = []
    const params = []
    if (periode) {
      const t = today()
      const from = periode === 'mois' ? monthStart(t) : addMonths(monthStart(t), periode === '3m' ? -3 : periode === '6m' ? -6 : -12)
      where.push('vf.date_emission >= ?')
      params.push(from)
    }
    if (q) {
      where.push('(vf.numero LIKE ? OR c.nom LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }
    if (statut) where.push(`(${STATUT_SQL[statut]})`)

    const rows = await query(
      `SELECT vf.id AS id, vf.numero AS numero, c.id AS clientId, c.nom AS client,
              vf.date_emission AS emission, vf.date_limite AS echeance,
              vf.total AS total, vf.encaisse AS encaisse, vf.versements AS versements, vf.statut AS statut,
              (SELECT cp.libelle FROM transactions t JOIN comptes cp ON cp.id = t.compte_id
                WHERE t.facture_id = vf.id ORDER BY t.date_transaction DESC, t.id DESC LIMIT 1) AS compte
         FROM v_factures vf JOIN clients c ON c.id = vf.client_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY vf.date_emission DESC, vf.id DESC
        LIMIT 100`,
      params,
    )

    return { factures: rows.map((r) => ({ ...r, compte: r.compte ?? '—', tone: toneOf(r.clientId) })) }
  }),
)

// ----- Modèle de facture : toutes les informations d'une facture, organisées pour le document imprimable
// Entreprise (en-tête et pied de page) : lue dans « parametres » (clés entreprise_* et facture_*, voir database/entreprise.sql)
const ENTREPRISE_CLES = [
  'entreprise_nom', 'entreprise_slogan', 'entreprise_adresse', 'entreprise_telephone', 'entreprise_email', 'entreprise_site',
  'entreprise_niu', 'entreprise_rccm', 'facture_paiement_banque', 'facture_paiement_mobile', 'facture_conditions', 'facture_mentions',
]

router.get('/:id', async (req, res, next) => {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

    const f = await queryOne(
      `SELECT vf.id AS id, vf.numero AS numero, vf.date_emission AS emission, vf.periode_debut AS periodeDebut, vf.date_limite AS echeance,
              vf.total AS total, vf.encaisse AS encaisse, vf.reste AS reste, vf.statut AS statut,
              c.id AS clientId, c.code AS clientCode, c.nom AS clientNom, c.telephone AS telephone, c.email AS email,
              c.adresse AS adresse, c.ville AS ville, c.forme_juridique AS formeJuridique, c.activite AS activite,
              e.nom AS emisePar
         FROM v_factures vf JOIN clients c ON c.id = vf.client_id LEFT JOIN employes e ON e.id = vf.created_by
        WHERE vf.id = ?`,
      [id],
    )
    if (!f) return res.status(404).json({ error: 'Facture introuvable' })

    // Lignes de la facture : chacune vise une prestation OU un projet
    const lignes = await query(
      `SELECT l.id AS id, l.description AS description, l.montant AS montant,
              l.prestation_id AS prestationId, pr.reference AS prestationRef, pr.titre AS prestationTitre, tp.libelle AS prestationType, pr.quantite AS prestationQuantite,
              l.projet_id AS projetId, pj.reference AS projetRef, pj.titre AS projetTitre
         FROM lignes_facture l
         LEFT JOIN prestations pr ON pr.id = l.prestation_id
         LEFT JOIN types_prestation tp ON tp.id = pr.type_prestation_id
         LEFT JOIN projets pj ON pj.id = l.projet_id
        WHERE l.facture_id = ? ORDER BY l.id`,
      [id],
    )

    // Détail de chaque ligne : lignes de la prestation (quantité × prix) ou services du projet (si le projet en a)
    const optional = async (sql, params) => {
      try {
        return await query(sql, params)
      } catch (err) {
        if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') return [] // migration pas encore exécutée : pas de détail
        throw err
      }
    }
    const groupes = []
    for (const l of lignes) {
      if (l.prestationId) {
        const details = await optional(
          'SELECT libelle, quantite, prix_unitaire AS prixUnitaire, total FROM prestation_lignes WHERE prestation_id = ? ORDER BY id',
          [l.prestationId],
        )
        groupes.push({ type: 'prestation', ref: l.prestationRef, titre: l.prestationTitre ?? l.description, sousTitre: l.prestationType, montant: l.montant, details })
      } else {
        const details = await optional('SELECT libelle, prix AS total FROM projet_services WHERE projet_id = ? ORDER BY position, id', [l.projetId])
        const somme = details.reduce((n, d) => n + d.total, 0)
        groupes.push({ type: 'projet', ref: l.projetRef, titre: l.projetTitre ?? l.description, sousTitre: 'Projet créatif', montant: l.montant, details: somme === l.montant ? details : [] })
      }
    }

    // Paiements reçus, du plus ancien au plus récent, avec le reste à payer après chacun
    const versements = await query(
      `SELECT t.id AS id, t.date_transaction AS date, t.libelle AS libelle, t.montant AS montant, c.libelle AS compte, e.nom AS par
         FROM transactions t JOIN comptes c ON c.id = t.compte_id LEFT JOIN employes e ON e.id = t.created_by
        WHERE t.facture_id = ? ORDER BY t.date_transaction, t.id`,
      [id],
    )
    let restant = f.total
    const paiements = versements.map((v) => ({ ...v, resteApres: (restant -= v.montant) }))

    const params = await query(`SELECT cle, valeur FROM parametres WHERE cle IN (${ENTREPRISE_CLES.map(() => '?').join(',')})`, ENTREPRISE_CLES)
    const entreprise = Object.fromEntries(params.map((r) => [r.cle.replace(/^(entreprise|facture)_/, ''), r.valeur]))
    entreprise.nom = entreprise.nom || 'GAIA'

    res.json({
      facture: { id: f.id, numero: f.numero, emission: f.emission, periodeDebut: f.periodeDebut, echeance: f.echeance, statut: f.statut, emisePar: f.emisePar, total: f.total, encaisse: f.encaisse, reste: f.reste },
      client: { id: f.clientId, code: f.clientCode, nom: f.clientNom, telephone: f.telephone, email: f.email, adresse: f.adresse, ville: f.ville, formeJuridique: f.formeJuridique, activite: f.activite },
      groupes,
      paiements,
      entreprise,
    })
  } catch (err) {
    next(err)
  }
})

export default router
