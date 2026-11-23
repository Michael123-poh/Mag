import { Router } from 'express'
import { z } from 'zod'
import { pool, query, queryOne } from '../db.js'
import { addDays, addMonths, asyncJson, firstName, mondayOf, today, toId, toneOf } from '../util.js'

const router = Router()

const JOURS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const BLOC_TONES = ['dark', 'blue', 'orange']

// La colonne « position » (ordre des tâches dans leur colonne) vient de database/migration_taches_ordre.sql.
// Tant qu'elle n'existe pas, on garde l'ancien ordre et le déplacement est refusé avec un message clair.
let positionColumn
async function hasPosition() {
  if (positionColumn === undefined) {
    positionColumn = !!(await queryOne("SHOW COLUMNS FROM taches_projet LIKE 'position'"))
  }
  return positionColumn
}

// ------------------------------------------------------------------ liste + calendrier + équipe
router.get(
  '/',
  asyncJson(async (req) => {
    const t = today()
    const asked = typeof req.query.mois === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.mois) ? req.query.mois : null
    const mois = asked ?? t.slice(0, 7)
    const start = `${mois}-01`
    const end = addMonths(start, 1)

    // Charge de chaque journée (comme les contributions d'un calendrier GitHub) : n = tâches planifiées ce jour-là,
    // tous projets confondus ; projets = nombre de projets différents concernés. Les prestations n'y comptent pas.
    const days = await query(
      `SELECT DATE(debut) AS date, COUNT(*) AS n, COUNT(DISTINCT projet_id) AS projets
         FROM taches_projet
        WHERE debut >= ? AND debut < ?
        GROUP BY DATE(debut) ORDER BY date`,
      [start, end],
    )

    const equipe = await query(
      `SELECT e.id AS id, e.nom AS nom, COUNT(DISTINCT p.id) AS projets
         FROM employes e
         JOIN user_projet up ON up.employe_id = e.id
         JOIN projets p ON p.id = up.projet_id AND p.statut = 'en_cours'
        GROUP BY e.id, e.nom
        ORDER BY projets DESC, e.nom LIMIT 3`,
    )

    const projets = await query(
      `SELECT p.id AS id, p.titre AS titre, c.nom AS client, tj.libelle AS type,
              p.date_fin AS echeance, a.avancement AS avancement
         FROM projets p
         JOIN clients c ON c.id = p.client_id
         JOIN types_projet tj ON tj.id = p.type_projet_id
         JOIN v_projets_avancement a ON a.projet_id = p.id
        ORDER BY (p.statut = 'en_cours') DESC, p.date_debut DESC, p.id DESC`,
    )

    return {
      mois,
      calendrier: days,
      equipe: equipe.map((e) => ({ ...e, tone: toneOf(e.id) })),
      projets,
    }
  }),
)

// ------------------------------------------------------------------ nouveau projet : services, bouquets, création
const TEMPLATES = ['Post', 'Post + Stories', 'Stories', 'Complet']
const RESEAUX = ['Facebook', 'LinkedIn', 'YouTube', 'Instagram']
const MISSING_TABLES = 'Tables manquantes : exécutez database/migration_projet.sql puis database/bouquets.sql'

// Texte affiché d'un service dans un projet : « Pack visuel × 10 », « Cover réseaux sociaux — Facebook, LinkedIn »
const libelleOf = (service, quantite, detail) =>
  `${service.libelle}${service.saisie === 'quantite' && quantite ? ` × ${quantite}` : ''}${detail ? ` — ${detail}` : ''}`

// Statut d'un paiement de service : payé · acompte · non payé
const paiementOf = (paye, prix) => (paye >= prix ? 'paye' : paye > 0 ? 'acompte' : 'non_paye')

router.get('/options', async (req, res, next) => {
  try {
    const services = await query('SELECT code, libelle, saisie, a_la_carte AS aLaCarte FROM services_projet ORDER BY position, id')
    const rows = await query(
      `SELECT b.code AS code, b.nom AS nom, b.prix AS prix, s.code AS service, s.libelle AS libelle, s.saisie AS saisie, bs.quantite AS quantite, bs.detail AS detail
         FROM bouquets b JOIN bouquet_services bs ON bs.bouquet_id = b.id JOIN services_projet s ON s.id = bs.service_id
        ORDER BY b.position, b.id, bs.position, bs.id`,
    )
    const bouquets = []
    for (const r of rows) {
      let b = bouquets.find((x) => x.code === r.code)
      if (!b) bouquets.push((b = { code: r.code, nom: r.nom, prix: r.prix, lignes: [] }))
      b.lignes.push({ service: r.service, libelle: r.libelle, saisie: r.saisie, quantite: r.quantite, detail: r.detail })
    }
    res.json({ services: services.map((x) => ({ ...x, aLaCarte: !!x.aLaCarte })), bouquets, templates: TEMPLATES, reseaux: RESEAUX })
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return res.status(503).json({ error: MISSING_TABLES })
    next(err)
  }
})

// Recherche d'un client par son nom (même principe que pour les prestations)
router.get(
  '/clients',
  asyncJson(async (req) => {
    const words = String(typeof req.query.q === 'string' ? req.query.q : '').trim().slice(0, 80).split(/\s+/).filter(Boolean).slice(0, 4)
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

const OptionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
const NewProjet = z
  .object({
    client_id: z.number().int().positive(),
    titre: z.string().trim().min(2).max(200),
    bouquet: z.string().max(30).nullable().optional(),
    lignes: z
      .array(
        z.object({
          service: z.string().max(30),
          quantite: z.number().int().min(1).max(1000).nullable().optional(),
          detail: z.string().trim().max(120).nullable().optional(),
          prix: z.number().int().min(0).max(1_000_000_000),
        }),
      )
      .min(1)
      .max(30),
    date_debut: OptionalDate,
    date_fin: OptionalDate,
    description: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !v.date_debut || !v.date_fin || v.date_fin >= v.date_debut, { path: ['date_fin'], message: 'La fin doit suivre le début' })

const isDuplicate = (err) => err?.code === 'ER_DUP_ENTRY'

router.post('/', async (req, res, next) => {
  try {
    const parsed = NewProjet.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Informations invalides : vérifiez les champs' })
    const p = parsed.data

    if (!(await queryOne('SELECT id FROM clients WHERE id = ?', [p.client_id]))) return res.status(400).json({ error: 'Client introuvable' })

    const codes = p.lignes.map((l) => l.service)
    if (new Set(codes).size !== codes.length) return res.status(400).json({ error: 'Un service ne peut figurer qu’une fois dans le projet' })
    const services = await query(
      `SELECT id, code, libelle, saisie, a_la_carte AS aLaCarte FROM services_projet WHERE code IN (${codes.map(() => '?').join(',')})`,
      codes,
    )
    if (services.length !== codes.length) return res.status(400).json({ error: 'Un des services choisis n’existe plus' })

    // Bouquet choisi : le projet doit contenir exactement ses services
    let bouquet = null
    if (p.bouquet) {
      bouquet = await queryOne('SELECT id, prix FROM bouquets WHERE code = ?', [p.bouquet])
      if (!bouquet) return res.status(400).json({ error: 'Bouquet introuvable' })
      const contenu = (await query('SELECT s.code AS code FROM bouquet_services bs JOIN services_projet s ON s.id = bs.service_id WHERE bs.bouquet_id = ?', [bouquet.id])).map((r) => r.code)
      if ([...contenu].sort().join() !== [...codes].sort().join()) return res.status(400).json({ error: 'Les services ne correspondent pas au bouquet' })
    }

    // Chaque service : ce qu'il faut préciser (nombre, type de template, réseaux sociaux)
    const lignes = []
    for (const l of p.lignes) {
      const svc = services.find((x) => x.code === l.service)
      if (!bouquet && !svc.aLaCarte) return res.status(400).json({ error: `« ${svc.libelle} » n’est vendu que dans un bouquet` })
      const detail = l.detail || null
      if (svc.saisie === 'quantite' && !l.quantite) return res.status(400).json({ error: `Précisez le nombre pour « ${svc.libelle} »` })
      if (svc.saisie === 'template' && !TEMPLATES.includes(detail)) return res.status(400).json({ error: `Précisez le type de template` })
      if (svc.saisie === 'reseaux') {
        const list = (detail ?? '').split(', ').filter(Boolean)
        if (list.length === 0 || list.some((r) => !RESEAUX.includes(r)) || new Set(list).size !== list.length) {
          return res.status(400).json({ error: 'Précisez le ou les réseaux sociaux' })
        }
      }
      lignes.push({ svc, quantite: svc.saisie === 'aucune' || svc.saisie === 'template' || svc.saisie === 'reseaux' ? null : l.quantite ?? null, detail, prix: l.prix })
    }
    const total = lignes.reduce((n, l) => n + l.prix, 0)
    // Un bouquet a son prix : les prix des services le répartissent, leur somme doit y être égale
    if (bouquet && total !== bouquet.prix) {
      return res.status(400).json({ error: `La somme des prix doit égaler le prix du bouquet (${bouquet.prix} xaf)` })
    }

    // Type du projet : « Logo » s'il ne contient que le logo, sinon « Branding »
    const typeName = lignes.every((l) => l.svc.code === 'logo') ? 'Logo' : 'Branding'
    const type = (await queryOne('SELECT id FROM types_projet WHERE libelle = ?', [typeName])) ?? (await queryOne('SELECT id FROM types_projet ORDER BY id LIMIT 1'))
    if (!type) return res.status(503).json({ error: 'Aucun type de projet en base' })

    const year = today().slice(0, 4)
    const conn = await pool.getConnection()
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          await conn.beginTransaction()
          // Numéro du projet (ex. PR-2026-006) : le suivant de l'année
          const [[last]] = await conn.execute(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(reference, 9, 3) AS UNSIGNED)), 0) AS n FROM projets WHERE reference LIKE ?",
            [`PR-${year}-___`],
          )
          const reference = `PR-${year}-${String(last.n + 1).padStart(3, '0')}`
          const [ins] = await conn.execute(
            `INSERT INTO projets (reference, client_id, type_projet_id, titre, description, budget, cout, date_debut, date_fin, statut)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'en_cours')`,
            [reference, p.client_id, type.id, p.titre, p.description || null, total, p.date_debut ?? null, p.date_fin ?? null],
          )
          for (let i = 0; i < lignes.length; i++) {
            const l = lignes[i]
            await conn.execute(
              `INSERT INTO projet_services (projet_id, service_id, bouquet_id, quantite, detail, libelle, prix, position)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [ins.insertId, l.svc.id, bouquet?.id ?? null, l.quantite, l.detail, libelleOf(l.svc, l.quantite, l.detail), l.prix, i + 1],
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
    if (err?.code === 'ER_NO_SUCH_TABLE') return res.status(503).json({ error: MISSING_TABLES })
    next(err)
  }
})

// ------------------------------------------------------------------ détail d'un projet
router.get('/:id', async (req, res, next) => {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })

    const projet = await queryOne(
      `SELECT p.id AS id, p.titre AS titre, p.date_debut AS debut, p.date_fin AS fin, p.statut AS statut
         FROM projets p WHERE p.id = ?`,
      [id],
    )
    if (!projet) return res.status(404).json({ error: 'Projet introuvable' })

    const membres = await query(
      `SELECT e.id AS id, e.nom AS nom FROM user_projet up JOIN employes e ON e.id = up.employe_id
        WHERE up.projet_id = ? ORDER BY e.nom`,
      [id],
    )

    const taskCols = `t.id AS id, t.titre AS titre, t.urgente AS urgente, t.debut AS debut, t.fin AS fin, e.nom AS assignee, e.id AS assigneeId`
    const join = 'FROM taches_projet t LEFT JOIN employes e ON e.id = t.assignee_id'
    const ordered = await hasPosition()
    const byColumn = (statut) =>
      query(
        `SELECT ${taskCols} ${join} WHERE t.projet_id = ? AND t.statut = '${statut}'
          ORDER BY ${ordered ? 't.position, t.id' : 't.debut IS NULL, t.debut, t.id'}`,
        [id],
      )
    const faites = await byColumn('fait')
    const aFaire = await byColumn('a_faire')
    const enCours = await byColumn('en_cours')

    // Sous-étapes de toutes les tâches (une tâche peut changer de colonne à tout moment)
    const notes = await query(
      `SELECT n.id AS id, n.tache_id AS tacheId, n.contenu AS contenu, n.fait AS fait
         FROM tache_notes n JOIN taches_projet t ON t.id = n.tache_id
        WHERE t.projet_id = ? ORDER BY n.tache_id, n.position, n.id`,
      [id],
    )
    const withNotes = (task) => ({
      id: task.id,
      titre: task.titre,
      niveau: task.urgente ? 'urgent' : 'normal',
      debut: task.debut,
      fin: task.fin,
      assignee: task.assignee,
      notes: notes.filter((n) => n.tacheId === task.id).map((n) => ({ id: n.id, contenu: n.contenu, fait: !!n.fait })),
    })

    const counts = await queryOne(
      `SELECT COALESCE(SUM(statut = 'a_faire'), 0) AS aFaire, COALESCE(SUM(statut = 'fait'), 0) AS faites,
              COALESCE(SUM(statut = 'en_cours'), 0) AS enCours
         FROM taches_projet WHERE projet_id = ?`,
      [id],
    )

    // Planning (« Gestion des tâches ») : toutes les tâches à faire et en cours du projet, une semaine à la fois.
    // Par défaut la semaine en cours, sinon la plus proche qui a des tâches ; « ?semaine=AAAA-MM-JJ » choisit une autre semaine.
    const aPlacer = await query(
      `SELECT t.id AS id, t.titre AS titre, t.debut AS debut, t.fin AS fin, t.statut AS statut,
              e.id AS assigneeId, e.nom AS assignee
         FROM taches_projet t LEFT JOIN employes e ON e.id = t.assignee_id
        WHERE t.projet_id = ? AND t.statut IN ('a_faire', 'en_cours')
        ORDER BY t.debut IS NULL, t.debut, t.id`,
      [id],
    )
    const datees = aPlacer.filter((t) => t.debut)
    const lundiDe = (t) => mondayOf(t.debut.slice(0, 10))
    const semaines = [...new Set(datees.map(lundiDe))].sort()
    const courante = mondayOf(today())

    const demande = typeof req.query.semaine === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.semaine) ? mondayOf(req.query.semaine) : null
    let monday = demande ?? courante
    if (!demande && !semaines.includes(monday) && semaines.length) {
      monday = semaines.find((w) => w > courante) ?? semaines[semaines.length - 1]
    }

    const hours = (stamp) => {
      const [h, m] = stamp.split(' ')[1].split(':').map(Number)
      return h + m / 60
    }
    const blocs = datees
      .filter((t) => lundiDe(t) === monday)
      .map((t) => {
        const day = t.debut.slice(0, 10)
        return {
          id: t.id,
          col: Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) / 86_400_000),
          h: hours(t.debut),
          hFin: t.fin ? hours(t.fin) : hours(t.debut) + 2,
          who: firstName(t.assignee) || '—',
          avatar: toneOf(t.assigneeId),
          tone: BLOC_TONES[(t.assigneeId ?? 0) % BLOC_TONES.length],
          titre: t.titre,
          statut: t.statut,
        }
      })
    // Lundi → vendredi ; le week-end n'apparaît que si une tâche y tombe
    const colonnes = Math.max(5, ...blocs.map((b) => b.col + 1))
    const jours = JOURS.slice(0, colonnes).map((label, i) => {
      const d = addDays(monday, i)
      return { label, iso: d, date: `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(2, 4)}` }
    })
    const aPlanifier = aPlacer
      .filter((t) => !t.debut)
      .map((t) => ({ id: t.id, titre: t.titre, who: firstName(t.assignee) || '—', avatar: toneOf(t.assigneeId), tone: BLOC_TONES[(t.assigneeId ?? 0) % BLOC_TONES.length] }))

    const planning = {
      semaine: monday,
      courante,
      precedente: [...semaines].reverse().find((w) => w < monday) ?? null,
      suivante: semaines.find((w) => w > monday) ?? null,
      jours,
      blocs,
      aPlanifier,
    }

    // Projets voisins dans l'ordre de la liste des projets (flèches ← → du clavier sur la page de détail)
    const ordre = (await query("SELECT id FROM projets ORDER BY (statut = 'en_cours') DESC, date_debut DESC, id DESC")).map((r) => r.id)
    const place = ordre.indexOf(projet.id)

    res.json({
      id: projet.id,
      voisins: { precedent: ordre[place - 1] ?? null, suivant: ordre[place + 1] ?? null },
      titre: projet.titre,
      debut: projet.debut,
      fin: projet.fin,
      statut: projet.statut,
      membres: membres.map((m) => ({ ...m, tone: toneOf(m.id) })),
      taches: {
        aFaire: aFaire.map(withNotes),
        faites: faites.map(withNotes),
        enCours: enCours.map(withNotes),
        totaux: counts,
      },
      planning,
    })
  } catch (err) {
    next(err)
  }
})

// ------------------------------------------------------------------ gestion des paiements d'un projet
// Chaque service du projet a son prix ; le valider crédite le compte choisi (un encaissement rattaché au service).
router.get('/:id/paiements', async (req, res, next) => {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
    const projet = await queryOne(
      'SELECT p.id AS id, p.reference AS reference, p.titre AS titre, c.nom AS client FROM projets p JOIN clients c ON c.id = p.client_id WHERE p.id = ?',
      [id],
    )
    if (!projet) return res.status(404).json({ error: 'Projet introuvable' })

    const services = await query(
      `SELECT ps.id AS id, ps.libelle AS libelle, ps.prix AS prix, b.nom AS bouquet
         FROM projet_services ps LEFT JOIN bouquets b ON b.id = ps.bouquet_id
        WHERE ps.projet_id = ? ORDER BY ps.position, ps.id`,
      [id],
    )
    const versements = await query(
      `SELECT t.id AS id, t.projet_service_id AS sid, t.montant AS montant, t.date_transaction AS date, c.libelle AS compte, e.nom AS par, t.libelle AS libelle
         FROM transactions t JOIN comptes c ON c.id = t.compte_id LEFT JOIN employes e ON e.id = t.created_by
        WHERE t.projet_service_id IN (SELECT id FROM projet_services WHERE projet_id = ?)
        ORDER BY t.date_transaction DESC, t.id DESC`,
      [id],
    )
    const detail = services.map((s) => {
      const mine = versements.filter((v) => v.sid === s.id)
      const paye = mine.reduce((n, v) => n + v.montant, 0)
      return { id: s.id, libelle: s.libelle, bouquet: s.bouquet, prix: s.prix, paye, reste: Math.max(0, s.prix - paye), statut: paiementOf(paye, s.prix), versements: mine }
    })
    const total = detail.reduce((n, s) => n + s.prix, 0)
    const paye = detail.reduce((n, s) => n + s.paye, 0)
    res.json({
      projet,
      total,
      paye,
      reste: Math.max(0, total - paye),
      services: detail,
      historique: versements.map((v) => ({ ...v, service: services.find((s) => s.id === v.sid)?.libelle ?? '' })),
    })
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') return res.status(503).json({ error: MISSING_TABLES })
    next(err)
  }
})

const Paiement = z.object({ montant: z.number().int().min(1).max(10_000_000_000), compte: z.enum(['caisse', 'banque', 'mobile']) })

router.post('/:id/services/:sid/paiement', async (req, res, next) => {
  const projetId = toId(req.params.id)
  const sid = toId(req.params.sid)
  const parsed = Paiement.safeParse(req.body)
  if (!projetId || !sid || !parsed.success) return res.status(400).json({ error: 'Paiement invalide' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // Le service est verrouillé le temps du calcul : deux validations en même temps ne dépassent jamais le prix
    const [[svc]] = await conn.execute(
      `SELECT ps.id AS id, ps.prix AS prix, ps.libelle AS libelle, p.reference AS reference, c.nom AS client
         FROM projet_services ps JOIN projets p ON p.id = ps.projet_id JOIN clients c ON c.id = p.client_id
        WHERE ps.id = ? AND ps.projet_id = ? FOR UPDATE`,
      [sid, projetId],
    )
    if (!svc) {
      await conn.rollback()
      return res.status(404).json({ error: 'Service introuvable' })
    }
    const [[row]] = await conn.execute('SELECT COALESCE(SUM(montant), 0) AS paye, COUNT(*) AS n FROM transactions WHERE projet_service_id = ?', [sid])
    const reste = svc.prix - Number(row.paye)
    const { montant, compte } = parsed.data
    if (reste <= 0) {
      await conn.rollback()
      return res.status(400).json({ error: 'Ce service est déjà entièrement payé' })
    }
    if (montant > reste) {
      await conn.rollback()
      return res.status(400).json({ error: `Il ne reste que ${reste} xaf à payer sur ce service` })
    }
    const c = await queryOne('SELECT id FROM comptes WHERE code = ?', [compte])
    const type = await queryOne("SELECT id FROM types_transaction WHERE code = 'paiement_projet'")
    if (!c || !type) throw new Error('Compte ou type de transaction manquant')
    const genre = montant === reste ? (row.n > 0 ? 'Solde' : 'Paiement') : row.n > 0 ? 'Versement' : 'Acompte'
    await conn.execute(
      'INSERT INTO transactions (type_transaction_id, compte_id, montant, libelle, projet_service_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [type.id, c.id, montant, `${genre} projet · ${svc.reference} · ${svc.libelle} · ${svc.client}`.slice(0, 200), sid, req.user.id],
    )
    await conn.commit()
    res.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

// ------------------------------------------------------------------ nouvelle tâche (formulaire)
// Employés que l'on peut assigner : l'équipe du projet, ou tous les employés actifs si le projet n'a pas encore d'équipe.
router.get('/:id/taches/options', async (req, res, next) => {
  try {
    const id = toId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
    const projet = await queryOne('SELECT id, titre, date_debut AS debut, date_fin AS fin FROM projets WHERE id = ?', [id])
    if (!projet) return res.status(404).json({ error: 'Projet introuvable' })
    let employes = await query(
      `SELECT e.id AS id, e.nom AS nom FROM user_projet up JOIN employes e ON e.id = up.employe_id
        WHERE up.projet_id = ? AND e.actif = 1 ORDER BY e.nom`,
      [id],
    )
    if (employes.length === 0) employes = await query('SELECT id, nom FROM employes WHERE actif = 1 ORDER BY nom')
    res.json({ projet, employes })
  } catch (err) {
    next(err)
  }
})

const HEURE = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const NewTache = z
  .object({
    titre: z.string().trim().min(2).max(200),
    assignee_id: z.number().int().positive(),
    notes: z.array(z.string().trim().min(1).max(255)).max(30),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    debut: HEURE,
    fin: HEURE,
  })
  .refine((v) => v.fin > v.debut, { path: ['fin'], message: "L'heure de fin doit suivre l'heure de début" })

router.post('/:id/taches', async (req, res, next) => {
  try {
    const projetId = toId(req.params.id)
    const parsed = NewTache.safeParse(req.body)
    if (!projetId || !parsed.success) return res.status(400).json({ error: 'Informations invalides : vérifiez les champs' })
    const v = parsed.data
    if (Number.isNaN(Date.parse(`${v.date}T00:00:00Z`))) return res.status(400).json({ error: 'Date invalide' })

    if (!(await queryOne('SELECT id FROM projets WHERE id = ?', [projetId]))) return res.status(404).json({ error: 'Projet introuvable' })
    if (!(await queryOne('SELECT id FROM employes WHERE id = ? AND actif = 1', [v.assignee_id]))) {
      return res.status(400).json({ error: 'Employé introuvable' })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const ordered = await hasPosition()
      let position = 0
      if (ordered) {
        const [[last]] = await conn.execute("SELECT COALESCE(MAX(position), 0) AS p FROM taches_projet WHERE projet_id = ? AND statut = 'a_faire'", [projetId])
        position = Number(last.p) + 10 // en bas de la colonne « À faire »
      }
      const [ins] = await conn.execute(
        `INSERT INTO taches_projet (projet_id, assignee_id, titre, statut, ${ordered ? 'position, ' : ''}debut, fin)
         VALUES (?, ?, ?, 'a_faire', ${ordered ? '?, ' : ''}?, ?)`,
        ordered
          ? [projetId, v.assignee_id, v.titre, position, `${v.date} ${v.debut}:00`, `${v.date} ${v.fin}:00`]
          : [projetId, v.assignee_id, v.titre, `${v.date} ${v.debut}:00`, `${v.date} ${v.fin}:00`],
      )
      for (let i = 0; i < v.notes.length; i++) {
        await conn.execute('INSERT INTO tache_notes (tache_id, contenu, position) VALUES (?, ?, ?)', [ins.insertId, v.notes[i], i + 1])
      }
      await conn.commit()
      res.status(201).json({ id: ins.insertId })
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

// ------------------------------------------------------------------ valider / dévalider une sous-tâche
// On garde qui l'a terminée et quand (tache_notes.termine_par / termine_le).
router.patch('/:id/taches/:tacheId/notes/:noteId', async (req, res, next) => {
  try {
    const projetId = toId(req.params.id)
    const tacheId = toId(req.params.tacheId)
    const noteId = toId(req.params.noteId)
    const parsed = z.object({ fait: z.boolean() }).safeParse(req.body)
    if (!projetId || !tacheId || !noteId || !parsed.success) return res.status(400).json({ error: 'Requête invalide' })

    const note = await queryOne(
      `SELECT n.id AS id FROM tache_notes n JOIN taches_projet t ON t.id = n.tache_id
        WHERE n.id = ? AND n.tache_id = ? AND t.projet_id = ?`,
      [noteId, tacheId, projetId],
    )
    if (!note) return res.status(404).json({ error: 'Sous-tâche introuvable' })

    if (parsed.data.fait) {
      await query('UPDATE tache_notes SET fait = 1, termine_le = NOW(), termine_par = ? WHERE id = ?', [req.user.id, noteId])
    } else {
      await query('UPDATE tache_notes SET fait = 0, termine_le = NULL, termine_par = NULL WHERE id = ?', [noteId])
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ------------------------------------------------------------------ déplacer une tâche (glisser-déposer)
const COLONNES = ['a_faire', 'en_cours', 'fait']

// Place la tâche dans la colonne « statut » à la position « index » (0 = tout en haut) ; son statut change avec la colonne.
router.patch('/:id/taches/:tacheId/deplacer', async (req, res, next) => {
  try {
    const projetId = toId(req.params.id)
    const tacheId = toId(req.params.tacheId)
    const parsed = z.object({ statut: z.enum(COLONNES), index: z.number().int().min(0).max(1000) }).safeParse(req.body)
    if (!projetId || !tacheId || !parsed.success) return res.status(400).json({ error: 'Déplacement invalide' })
    if (!(await hasPosition())) {
      return res.status(503).json({ error: "Colonne manquante : exécutez database/migration_taches_ordre.sql puis redémarrez l'API" })
    }
    const { statut, index } = parsed.data

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [rows] = await conn.execute('SELECT id, statut FROM taches_projet WHERE projet_id = ? ORDER BY position, id FOR UPDATE', [projetId])
      const moved = rows.find((r) => r.id === tacheId)
      if (!moved) {
        await conn.rollback()
        return res.status(404).json({ error: 'Tâche introuvable' })
      }
      // Nouvelle colonne = ses tâches (sans la tâche déplacée) avec la tâche insérée à la bonne place
      const column = rows.filter((r) => r.statut === statut && r.id !== tacheId).map((r) => r.id)
      column.splice(Math.min(index, column.length), 0, tacheId)
      for (let i = 0; i < column.length; i++) {
        await conn.execute('UPDATE taches_projet SET position = ?, statut = ? WHERE id = ?', [(i + 1) * 10, statut, column[i]])
      }
      await conn.commit()
      res.json({ ok: true })
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
