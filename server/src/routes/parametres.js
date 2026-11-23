import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { config } from '../config.js'
import { pool, query, queryOne } from '../db.js'
import { lireMachine } from '../machines/xerox.js'
import { etatMachine } from '../machines/poller.js'
import { LIMITES, reglagesMachines } from '../machines/reglages.js'
import { asyncJson, toId } from '../util.js'

// Page Paramètre (réservée aux administrateurs) : employés et privilèges, taux d'épargne, machines et lecture des machines.
const router = Router()
const MISSING = 'Colonne manquante : exécutez database/migration_parametres.sql'
const isDuplicate = (err) => err?.code === 'ER_DUP_ENTRY'

async function setParam(cle, valeur) {
  await query('INSERT INTO parametres (cle, valeur) VALUES (?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)', [cle, String(valeur)])
}
const getParam = async (cle, defaut) => Number((await queryOne('SELECT valeur FROM parametres WHERE cle = ?', [cle]))?.valeur ?? defaut)

// ------------------------------------------------------------------ épargne + réglages de lecture
router.get(
  '/',
  asyncJson(async () => ({
    epargne: { taux: await getParam('taux_epargne', 30), objectif: await getParam('objectif_mensuel', 0) },
    lecture: await reglagesMachines(),
    limites: LIMITES,
  })),
)

const Epargne = z.object({ taux: z.number().min(0).max(100), objectif: z.number().int().min(0).max(10_000_000_000).optional() })
router.patch(
  '/epargne',
  asyncJson(async (req, res) => {
    const p = Epargne.safeParse(req.body)
    if (!p.success) {
      res.status(400)
      return { error: 'Le taux doit être compris entre 0 et 100 %' }
    }
    await setParam('taux_epargne', Math.round(p.data.taux * 100) / 100)
    if (p.data.objectif !== undefined) await setParam('objectif_mensuel', p.data.objectif)
    return { ok: true }
  }),
)

const Lecture = z.object({
  intervalle: z.number().int().min(LIMITES.intervalle[0]).max(LIMITES.intervalle[1]),
  releveMinutes: z.number().int().min(LIMITES.releve[0]).max(LIMITES.releve[1]),
})
router.patch(
  '/lecture',
  asyncJson(async (req, res) => {
    const p = Lecture.safeParse(req.body)
    if (!p.success) {
      res.status(400)
      return { error: `Intervalle : ${LIMITES.intervalle[0]} à ${LIMITES.intervalle[1]} secondes · relevés : ${LIMITES.releve[0]} à ${LIMITES.releve[1]} minutes` }
    }
    await setParam('machines_intervalle_secondes', p.data.intervalle)
    await setParam('machines_releve_minutes', p.data.releveMinutes)
    return { ok: true } // la lecture en cours s'adapte au prochain tour
  }),
)

// ------------------------------------------------------------------ employés
const EmployeBase = z.object({
  nom: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  telephone: z.string().trim().max(30).optional(),
  poste: z.string().trim().min(2).max(60), // titre du poste (Gérant, Graphiste…)
  fonction: z.string().trim().max(255).optional(), // ce que fait l'employé
  salaire: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  date_embauche: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  privileges: z.array(z.string().max(60)).max(40),
})
const NewEmploye = EmployeBase.extend({ mot_de_passe: z.string().min(8).max(100) })
const UpdateEmploye = EmployeBase.extend({ mot_de_passe: z.string().min(8).max(100).optional(), actif: z.boolean().optional() })

async function listeEmployes() {
  const rows = await query(
    `SELECT e.id AS id, e.matricule AS matricule, e.nom AS nom, e.email AS email, e.telephone AS telephone, t.libelle AS poste,
            e.fonction AS fonction, e.salaire AS salaire, e.date_embauche AS dateEmbauche, e.actif AS actif
       FROM employes e JOIN types_employe t ON t.id = e.type_employe_id ORDER BY e.actif DESC, e.nom`,
  )
  const privs = await query('SELECT ep.employe_id AS id, p.code AS code FROM employe_privileges ep JOIN privileges p ON p.id = ep.privilege_id')
  return rows.map((r) => ({ ...r, actif: !!r.actif, privileges: privs.filter((p) => p.id === r.id).map((p) => p.code) }))
}

router.get('/employes', async (req, res, next) => {
  try {
    res.json({
      employes: await listeEmployes(),
      postes: (await query('SELECT libelle FROM types_employe ORDER BY libelle')).map((r) => r.libelle),
      privileges: await query('SELECT code, libelle FROM privileges ORDER BY id'),
      moi: req.user.id,
    })
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') return res.status(503).json({ error: MISSING })
    next(err)
  }
})

// Poste = titre du poste : on réutilise celui qui existe, sinon on le crée
async function posteId(conn, libelle) {
  const [[row]] = await conn.execute('SELECT id FROM types_employe WHERE libelle = ?', [libelle])
  if (row) return row.id
  const [ins] = await conn.execute('INSERT INTO types_employe (libelle) VALUES (?)', [libelle])
  return ins.insertId
}

async function remplacerPrivileges(conn, employeId, codes) {
  const unique = [...new Set(codes)]
  let ids = []
  if (unique.length) {
    const [rows] = await conn.execute(`SELECT id, code FROM privileges WHERE code IN (${unique.map(() => '?').join(',')})`, unique)
    if (rows.length !== unique.length) throw Object.assign(new Error('Privilège inconnu'), { statut: 400 })
    ids = rows.map((r) => r.id)
  }
  await conn.execute('DELETE FROM employe_privileges WHERE employe_id = ?', [employeId])
  for (const id of ids) await conn.execute('INSERT INTO employe_privileges (employe_id, privilege_id) VALUES (?, ?)', [employeId, id])
}

const erreur = (res, statut, message) => res.status(statut).json({ error: message })

router.post('/employes', async (req, res, next) => {
  const parsed = NewEmploye.safeParse(req.body)
  if (!parsed.success) return erreur(res, 400, 'Informations invalides : nom, email, poste et mot de passe (8 caractères minimum) sont obligatoires')
  const v = parsed.data
  const hash = await bcrypt.hash(v.mot_de_passe, 10)
  const conn = await pool.getConnection()
  try {
    for (let essai = 0; ; essai++) {
      try {
        await conn.beginTransaction()
        const poste = await posteId(conn, v.poste)
        const [[last]] = await conn.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(matricule, 5) AS UNSIGNED)), 0) AS n FROM employes WHERE matricule LIKE 'EMP-%'")
        const matricule = `EMP-${String(last.n + 1).padStart(3, '0')}`
        const [ins] = await conn.execute(
          `INSERT INTO employes (matricule, nom, email, telephone, mot_de_passe_hash, type_employe_id, fonction, salaire, date_embauche)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [matricule, v.nom, v.email, v.telephone || null, hash, poste, v.fonction || null, v.salaire ?? null, v.date_embauche ?? null],
        )
        await remplacerPrivileges(conn, ins.insertId, v.privileges)
        await conn.commit()
        return res.status(201).json({ id: ins.insertId, matricule })
      } catch (err) {
        await conn.rollback()
        if (isDuplicate(err) && String(err.message).includes('email')) return erreur(res, 409, 'Cet email est déjà utilisé par un autre employé')
        if (!isDuplicate(err) || essai >= 4) throw err // matricule déjà pris par une création simultanée : on réessaie
      }
    }
  } catch (err) {
    if (err?.statut) return erreur(res, err.statut, err.message)
    next(err)
  } finally {
    conn.release()
  }
})

router.patch('/employes/:id', async (req, res, next) => {
  const id = toId(req.params.id)
  const parsed = UpdateEmploye.safeParse(req.body)
  if (!id || !parsed.success) return erreur(res, 400, 'Informations invalides : nom, email et poste sont obligatoires')
  const v = parsed.data
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[cible]] = await conn.execute('SELECT id, actif FROM employes WHERE id = ? FOR UPDATE', [id])
    if (!cible) {
      await conn.rollback()
      return erreur(res, 404, 'Employé introuvable')
    }
    // On ne se retire pas ses propres droits d'administrateur, et il reste toujours au moins un administrateur actif
    const resteAdmin = v.privileges.includes('administrer') && (v.actif ?? !!cible.actif)
    if (!resteAdmin) {
      const [[autres]] = await conn.execute(
        `SELECT COUNT(*) AS n FROM employes e JOIN employe_privileges ep ON ep.employe_id = e.id JOIN privileges p ON p.id = ep.privilege_id
          WHERE p.code = 'administrer' AND e.actif = 1 AND e.id <> ?`,
        [id],
      )
      if (autres.n === 0) {
        await conn.rollback()
        return erreur(res, 400, 'Il doit rester au moins un administrateur actif')
      }
      if (id === req.user.id) {
        await conn.rollback()
        return erreur(res, 400, 'Vous ne pouvez pas retirer vos propres droits d’administrateur ni désactiver votre compte')
      }
    }
    const poste = await posteId(conn, v.poste)
    await conn.execute(
      `UPDATE employes SET nom = ?, email = ?, telephone = ?, type_employe_id = ?, fonction = ?, salaire = ?, date_embauche = ?, actif = ? WHERE id = ?`,
      [v.nom, v.email, v.telephone || null, poste, v.fonction || null, v.salaire ?? null, v.date_embauche ?? null, (v.actif ?? !!cible.actif) ? 1 : 0, id],
    )
    if (v.mot_de_passe) await conn.execute('UPDATE employes SET mot_de_passe_hash = ? WHERE id = ?', [await bcrypt.hash(v.mot_de_passe, 10), id])
    await remplacerPrivileges(conn, id, v.privileges)
    await conn.commit()
    res.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    if (isDuplicate(err)) return erreur(res, 409, 'Cet email est déjà utilisé par un autre employé')
    if (err?.statut) return erreur(res, err.statut, err.message)
    next(err)
  } finally {
    conn.release()
  }
})

// ------------------------------------------------------------------ machines
// Seules les adresses du réseau local (192.168.x.x, 10.x.x.x, 172.16-31.x.x) sont acceptées : l'application ne lit que les machines de l'atelier
const PRIVEE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/
const Adresse = z.string().trim().regex(PRIVEE, 'Adresse du réseau local attendue (ex. 192.168.1.150)')

const MachineBase = z.object({
  nom: z.string().trim().min(2).max(120),
  modele: z.string().trim().max(120).optional(),
  protocole: z.enum(['snmp', 'manuel']),
  adresse: z.string().trim().max(120).optional(),
  numero_serie: z.string().trim().max(60).optional(),
  couleur_support: z.string().trim().max(60).optional(),
  mode_impression: z.string().trim().max(60).optional(),
  image: z.string().trim().max(255).regex(/^[\w.-]*$/, 'Nom de fichier seulement (ex. xerox7835.png)').optional(),
  actif: z.boolean().optional(),
})
const verifierMachine = (v) => (v.protocole === 'snmp' ? Adresse.safeParse(v.adresse ?? '') : { success: true })

router.get(
  '/machines',
  asyncJson(async () => {
    const machines = await query(
      `SELECT id, nom, modele, protocole, adresse_reseau AS adresse, numero_serie AS numeroSerie, couleur_support AS couleurSupport,
              mode_impression AS modeImpression, image, actif FROM machines ORDER BY actif DESC, id`,
    )
    let remises = []
    try {
      remises = await query(
        `SELECT r.id AS id, m.nom AS machine, r.remise_le AS le, e.nom AS par, r.valeurs AS valeurs
           FROM machine_remises_a_zero r JOIN machines m ON m.id = r.machine_id LEFT JOIN employes e ON e.id = r.par
          ORDER BY r.remise_le DESC, r.id DESC LIMIT 50`,
      )
    } catch (err) {
      if (err?.code !== 'ER_NO_SUCH_TABLE') throw err // migration_remise_zero.sql pas encore exécutée : pas d'historique
    }
    return {
      machines: machines.map((m) => ({ ...m, actif: !!m.actif, enLigne: m.protocole === 'snmp' ? (etatMachine(m.id)?.enLigne ?? null) : null })),
      remises: remises.map((r) => {
        const valeurs = typeof r.valeurs === 'string' ? JSON.parse(r.valeurs) : r.valeurs
        return { id: r.id, machine: r.machine, le: r.le, par: r.par, total: valeurs?.TotalImpressions ?? null }
      }),
    }
  }),
)

// « Tester la connexion » : lit le nom et le numéro de série de la machine (lecture seule) pour préremplir le formulaire
router.post(
  '/machines/tester',
  asyncJson(async (req) => {
    const p = Adresse.safeParse(req.body?.adresse)
    if (!p.success) return { ok: false, erreur: p.error.issues[0].message }
    try {
      const lecture = await lireMachine({ adresse: p.data, communaute: config.machines.snmpCommunity })
      return { ok: true, nom: lecture.nom, serie: lecture.serie, modele: lecture.modele, magasins: lecture.magasins.length }
    } catch (err) {
      return { ok: false, erreur: err?.message?.includes('timed out') ? 'La machine ne répond pas à cette adresse (éteinte, ou autre adresse ?)' : (err?.message ?? 'Connexion impossible') }
    }
  }),
)

router.post('/machines', async (req, res, next) => {
  try {
    const parsed = MachineBase.safeParse(req.body)
    if (!parsed.success) return erreur(res, 400, 'Informations invalides : vérifiez le nom et le fichier image')
    const v = parsed.data
    const ok = verifierMachine(v)
    if (!ok.success) return erreur(res, 400, ok.error.issues[0].message)
    const [ins] = await pool.execute(
      `INSERT INTO machines (nom, modele, numero_serie, adresse_reseau, protocole, couleur_support, mode_impression, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.nom, v.modele || null, v.numero_serie || null, v.protocole === 'snmp' ? v.adresse : null, v.protocole, v.couleur_support || null, v.mode_impression || null, v.image || null],
    )
    res.status(201).json({ id: ins.insertId }) // la lecture démarre au prochain tour
  } catch (err) {
    if (isDuplicate(err)) return erreur(res, 409, 'Une machine a déjà ce numéro de série')
    next(err)
  }
})

router.patch('/machines/:id', async (req, res, next) => {
  try {
    const id = toId(req.params.id)
    const parsed = MachineBase.safeParse(req.body)
    if (!id || !parsed.success) return erreur(res, 400, 'Informations invalides : vérifiez le nom et le fichier image')
    const v = parsed.data
    const ok = verifierMachine(v)
    if (!ok.success) return erreur(res, 400, ok.error.issues[0].message)
    if (!(await queryOne('SELECT id FROM machines WHERE id = ?', [id]))) return erreur(res, 404, 'Machine introuvable')
    await query(
      `UPDATE machines SET nom = ?, modele = ?, numero_serie = ?, adresse_reseau = ?, protocole = ?, couleur_support = ?, mode_impression = ?, image = ?, actif = ?
        WHERE id = ?`,
      [v.nom, v.modele || null, v.numero_serie || null, v.protocole === 'snmp' ? v.adresse : null, v.protocole, v.couleur_support || null, v.mode_impression || null, v.image || null, (v.actif ?? true) ? 1 : 0, id],
    )
    res.json({ ok: true })
  } catch (err) {
    if (isDuplicate(err)) return erreur(res, 409, 'Une machine a déjà ce numéro de série')
    next(err)
  }
})

export default router
