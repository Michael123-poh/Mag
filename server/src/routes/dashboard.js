import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { addDays, addMonths, asyncJson, daysBetween, monthEnd, monthStart, today, yearStart } from '../util.js'

const router = Router()
const MOIS = ['janv', 'févr', 'mars', 'avril', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']
const FORMATS = ['A4', 'A3', 'SRA3']

router.get(
  '/',
  asyncJson(async (req) => {
    const t = today()
    const mStart = monthStart(t)
    const yStart = yearStart(t)

    // --- Entrées / sorties sur 7 jours, le mois et l'année
    const fluxRows = await query(
      `SELECT tt.sens AS sens,
              SUM(CASE WHEN DATE(t.date_transaction) >= DATE_SUB(?, INTERVAL 6 DAY) THEN t.montant ELSE 0 END) AS weekly,
              SUM(CASE WHEN DATE(t.date_transaction) >= ? THEN t.montant ELSE 0 END) AS monthly,
              SUM(CASE WHEN DATE(t.date_transaction) >= ? THEN t.montant ELSE 0 END) AS yearly
         FROM transactions t
         JOIN types_transaction tt ON tt.id = t.type_transaction_id
        WHERE DATE(t.date_transaction) >= ? AND DATE(t.date_transaction) <= ?
        GROUP BY tt.sens`,
      [t, mStart, yStart, yStart, t],
    )
    const pick = (sens) => fluxRows.find((r) => r.sens === sens) ?? { weekly: 0, monthly: 0, yearly: 0 }
    const flux = {
      entrees: { weekly: pick('encaissement').weekly, monthly: pick('encaissement').monthly, yearly: pick('encaissement').yearly },
      sorties: { weekly: pick('decaissement').weekly, monthly: pick('decaissement').monthly, yearly: pick('decaissement').yearly },
    }

    // --- Projets
    const pj = await queryOne(
      `SELECT COALESCE(SUM(statut = 'en_cours'), 0) AS en_cours,
              COALESCE(SUM(statut = 'termine'), 0) AS termines,
              COUNT(*) AS total
         FROM projets`,
    )

    // --- Impression : feuilles par format sur les 7 derniers jours (écart entre relevés de la machine)
    const relevesRows = await query(
      `SELECT rv.code AS code, rv.valeur AS valeur
         FROM releve_valeurs rv
         JOIN releves_machine r ON r.id = rv.releve_id
        WHERE rv.code LIKE 'MediaSize.%'
          AND DATE(r.releve_le) >= DATE_SUB(?, INTERVAL 7 DAY) AND DATE(r.releve_le) <= ?
        ORDER BY r.releve_le, rv.code`,
      [t, t],
    )
    const byCode = {}
    relevesRows.forEach((r) => (byCode[r.code] ??= []).push(r.valeur))
    const impression = FORMATS.filter((f) => byCode[`MediaSize.${f}`]).map((f) => {
      const vals = byCode[`MediaSize.${f}`]
      return { label: f, value: Math.max(0, vals[vals.length - 1] - vals[0]) }
    })

    // --- Alertes stock : sous le seuil, ou toner presque vide sur la machine
    const lowRows = await query('SELECT id FROM v_stocks WHERE sous_le_seuil = 1')
    const niveaux = await query(
      `SELECT ms.stock_id AS stock_id, rv.valeur AS valeur
         FROM machine_stocks ms
         JOIN releves_machine r ON r.machine_id = ms.machine_id
         JOIN releve_valeurs rv ON rv.releve_id = r.id AND rv.code = ms.compteur_code
        WHERE ms.mesure = 'niveau'
          AND r.id = (SELECT MAX(r2.id) FROM releves_machine r2 WHERE r2.machine_id = ms.machine_id)`,
    )
    const alertIds = new Set(lowRows.map((r) => r.id))
    niveaux.filter((n) => n.valeur <= 10).forEach((n) => alertIds.add(n.stock_id))

    // --- Progression des encaissements : mois en cours / même période du mois précédent
    const prevStart = addMonths(mStart, -1)
    const prevEnd = [addDays(prevStart, Number(t.slice(8, 10)) - 1), monthEnd(prevStart)].sort()[0]
    const sumEnc = async (from, to) =>
      (
        await queryOne(
          `SELECT COALESCE(SUM(t.montant), 0) AS total
             FROM transactions t JOIN types_transaction tt ON tt.id = t.type_transaction_id
            WHERE tt.sens = 'encaissement' AND DATE(t.date_transaction) BETWEEN ? AND ?`,
          [from, to],
        )
      ).total
    const [cur, prev] = [await sumEnc(mStart, t), await sumEnc(prevStart, prevEnd)]
    const progression = { pct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null }

    // --- Notes de l'utilisateur
    const notes = await query('SELECT id, contenu FROM notes WHERE employe_id = ? ORDER BY created_at DESC LIMIT 3', [req.user.id])

    // --- Projets en cours
    const projetsEnCours = await query(
      `SELECT p.id AS id, p.titre AS nom, p.date_debut AS debut, a.avancement AS avancement
         FROM projets p JOIN v_projets_avancement a ON a.projet_id = p.id
        WHERE p.statut = 'en_cours'
        ORDER BY p.date_debut DESC, p.id DESC LIMIT 4`,
    )

    // --- Graphique : 9 derniers mois
    const first = addMonths(mStart, -8)
    const mois = Array.from({ length: 9 }, (_, i) => {
      const d = addMonths(first, i)
      return { key: d.slice(0, 7), label: MOIS[Number(d.slice(5, 7)) - 1], facture: 0, encaisse: 0, decaisse: 0 }
    })
    const idx = Object.fromEntries(mois.map((m, i) => [m.key, i]))
    const facRows = await query(
      `SELECT DATE_FORMAT(f.date_emission, '%Y-%m') AS ym, SUM(l.montant) AS total
         FROM factures f JOIN lignes_facture l ON l.facture_id = f.id
        WHERE f.date_emission >= ? AND f.date_emission <= ? GROUP BY ym`,
      [first, t],
    )
    facRows.forEach((r) => idx[r.ym] !== undefined && (mois[idx[r.ym]].facture = r.total))
    const trRows = await query(
      `SELECT DATE_FORMAT(t.date_transaction, '%Y-%m') AS ym, tt.sens AS sens, SUM(t.montant) AS total
         FROM transactions t JOIN types_transaction tt ON tt.id = t.type_transaction_id
        WHERE DATE(t.date_transaction) >= ? AND DATE(t.date_transaction) <= ? GROUP BY ym, tt.sens`,
      [first, t],
    )
    trRows.forEach((r) => {
      if (idx[r.ym] === undefined) return
      mois[idx[r.ym]][r.sens === 'encaissement' ? 'encaisse' : 'decaisse'] = r.total
    })
    const chart = {
      debut: first,
      fin: t,
      mois: mois.map(({ label, facture, encaisse, decaisse }) => ({ label, facture, encaisse, decaisse })),
      totaux: {
        facture: mois.reduce((s, m) => s + m.facture, 0),
        encaisse: mois.reduce((s, m) => s + m.encaisse, 0),
        decaisse: mois.reduce((s, m) => s + m.decaisse, 0),
      },
    }

    // --- Gains nets par produit / service (année en cours) : chiffre d'affaires - coût de revient
    const gainRows = await query(
      `SELECT 'Prestation' AS type, tp.libelle AS nom, SUM(l.montant) AS ca,
              SUM(p.cout * l.montant / NULLIF(p.tarif, 0)) AS cout, COUNT(DISTINCT p.id) AS nb
         FROM lignes_facture l
         JOIN factures f ON f.id = l.facture_id AND f.date_emission >= ?
         JOIN prestations p ON p.id = l.prestation_id
         JOIN types_prestation tp ON tp.id = p.type_prestation_id
        GROUP BY tp.id, tp.libelle
       UNION ALL
       SELECT 'Projet' AS type, tj.libelle AS nom, SUM(l.montant) AS ca,
              SUM(pr.cout * l.montant / NULLIF(pr.budget, 0)) AS cout, COUNT(DISTINCT pr.id) AS nb
         FROM lignes_facture l
         JOIN factures f ON f.id = l.facture_id AND f.date_emission >= ?
         JOIN projets pr ON pr.id = l.projet_id
         JOIN types_projet tj ON tj.id = pr.type_projet_id
        GROUP BY tj.id, tj.libelle`,
      [yStart, yStart],
    )
    const gains = gainRows
      .map((g) => ({ type: g.type, nom: g.nom, ca: Math.round(g.ca), gain: Math.round(g.ca - (g.cout ?? 0)), nb: g.nb }))
      .filter((g) => g.gain > 0)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 6)

    // --- À encaisser : clients qui nous doivent de l'argent, échéance la plus proche d'abord
    const dettes = await query(
      `SELECT c.id AS client_id, c.nom AS nom, SUM(vf.reste) AS montant, MIN(vf.date_limite) AS echeance
         FROM v_factures vf JOIN clients c ON c.id = vf.client_id
        WHERE vf.reste > 0
        GROUP BY c.id, c.nom
        ORDER BY echeance ASC, montant DESC LIMIT 3`,
    )
    const debts = []
    for (const d of dettes) {
      const ref = await queryOne(
        `SELECT l.description AS description
           FROM lignes_facture l JOIN v_factures vf ON vf.id = l.facture_id
          WHERE vf.client_id = ? AND vf.reste > 0
          ORDER BY vf.date_limite, l.id LIMIT 1`,
        [d.client_id],
      )
      debts.push({
        clientId: d.client_id,
        nom: d.nom,
        ref: ref?.description ?? '',
        montant: d.montant,
        echeance: d.echeance,
        jours: daysBetween(t, d.echeance),
      })
    }

    return {
      user: { nom: req.user.nom },
      today: t,
      flux,
      projets: { enCours: pj.en_cours, termines: pj.termines, total: pj.total },
      impression,
      alertStock: { count: alertIds.size },
      progression,
      notes,
      projetsEnCours,
      chart,
      gains,
      debts,
    }
  }),
)

export default router
