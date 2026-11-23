import { Router } from 'express'
import { query } from '../db.js'
import { requirePrivilege } from '../middleware/auth.js'
import { etatMachine, releverMaintenant } from '../machines/poller.js'
import { reglagesMachines } from '../machines/reglages.js'
import { ventiler } from '../machines/ventiler.js'
import { asyncJson, toId } from '../util.js'

const router = Router()
const MISSING = 'Colonnes manquantes : exécutez database/migration_machines.sql'

// Compteurs du dernier relevé enregistré (quand la machine n'est pas lue en direct) : { nomXerox: valeur }
async function dernierReleve(machineId) {
  const [releve] = await query('SELECT id, releve_le AS le FROM releves_machine WHERE machine_id = ? ORDER BY releve_le DESC, id DESC LIMIT 1', [machineId])
  if (!releve) return null
  const rows = await query("SELECT code, valeur FROM releve_valeurs WHERE releve_id = ? AND code LIKE 'Xerox.%'", [releve.id])
  if (rows.length === 0) return { le: releve.le, compteurs: null }
  return { le: releve.le, compteurs: Object.fromEntries(rows.map((r) => [r.code.slice('Xerox.'.length), Number(r.valeur)])) }
}

// Dernière remise à zéro de chaque machine : { le, par, valeurs } (les compteurs de la machine à ce moment-là)
async function dernieresRemises() {
  try {
    const rows = await query(
      `SELECT r.machine_id AS machineId, r.remise_le AS le, r.valeurs AS valeurs, e.nom AS par
         FROM machine_remises_a_zero r LEFT JOIN employes e ON e.id = r.par
        WHERE r.id = (SELECT MAX(x.id) FROM machine_remises_a_zero x WHERE x.machine_id = r.machine_id)`,
    )
    return new Map(rows.map((r) => [r.machineId, { le: r.le, par: r.par, valeurs: typeof r.valeurs === 'string' ? JSON.parse(r.valeurs) : r.valeurs }]))
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return new Map() // migration pas encore exécutée : aucune remise à zéro
    throw err
  }
}

// Ce qui a été fait depuis la remise à zéro : compteur actuel - compteur gardé (jamais négatif)
const ecart = (brut, base) =>
  Object.fromEntries(Object.entries(brut).map(([nom, v]) => [nom, v === null || base[nom] === null || base[nom] === undefined ? null : Math.max(0, v - base[nom])]))

// La machine telle que la page l'affiche : informations communes, magasins, compteurs, et d'où viennent ces chiffres
async function machineVue(m, magasinsEnBase, remise) {
  const etat = etatMachine(m.id)
  const lecture = etat?.lecture ?? null
  const reseau = m.protocole === 'snmp' && !!m.adresse

  // Compteurs bruts de la machine : lus en direct, sinon ceux du dernier relevé enregistré
  let brut = null
  let lectureLe = null
  if (lecture) {
    brut = lecture.compteurs
    lectureLe = etat.lectureLe
  } else {
    const releve = await dernierReleve(m.id)
    if (releve) {
      brut = releve.compteurs
      lectureLe = releve.le
    }
  }
  const compteursTotal = ventiler(brut) // depuis la mise en service de la machine
  const compteurs = remise && brut ? ventiler(ecart(brut, remise.valeurs)) : compteursTotal // depuis la remise à zéro s'il y en a une

  return {
    id: m.id,
    nom: m.nom,
    modele: m.modele,
    image: m.image,
    adresse: m.adresse,
    numeroSerie: m.numeroSerie,
    couleurSupport: m.couleurSupport,
    modeImpression: m.modeImpression,
    // En direct : bacs lus sur la machine (avec leur niveau). Sinon : ceux enregistrés en base.
    magasins: lecture?.magasins ?? magasinsEnBase.map(({ nom, type, couleur, dimension }) => ({ nom, type, couleur, dimension, capacite: null, niveau: null })),
    toners: lecture?.toners ?? null,
    compteurs,
    compteursTotal,
    remise: remise ? { le: remise.le, par: remise.par } : null,
    lectureLe,
    enLigne: reseau ? (etat?.enLigne ?? null) : null, // null = machine sans lecture réseau, ou pas encore lue
    erreur: etat?.erreur ?? null,
    reseau,
  }
}

const COLONNES = `id, nom, modele, image, protocole, adresse_reseau AS adresse, numero_serie AS numeroSerie,
                  couleur_support AS couleurSupport, mode_impression AS modeImpression`

async function toutesLesMachines(seulement) {
  const machines = await query(`SELECT ${COLONNES} FROM machines WHERE actif = 1 ${seulement ? 'AND id = ?' : ''} ORDER BY id`, seulement ? [seulement] : [])
  const magasins = await query('SELECT machine_id AS machineId, nom, type_papier AS type, couleur, dimension FROM machine_magasins ORDER BY machine_id, position, id')
  const remises = await dernieresRemises()
  return Promise.all(machines.map((m) => machineVue(m, magasins.filter((x) => x.machineId === m.id), remises.get(m.id))))
}

// Contrôle des machines : la liste des machines actives, avec leurs données en direct (rafraîchies toutes les `intervalle` secondes)
router.get(
  '/machines',
  asyncJson(async (req, res) => {
    try {
      return { machines: await toutesLesMachines(), intervalle: (await reglagesMachines()).intervalle }
    } catch (err) {
      if (err?.code === 'ER_BAD_FIELD_ERROR' || err?.code === 'ER_NO_SUCH_TABLE') {
        res.status(503)
        return { error: MISSING }
      }
      throw err
    }
  }),
)

// « Relever maintenant » : lecture immédiate de la machine et enregistrement d'un relevé
router.post(
  '/machines/:id/releve',
  asyncJson(async (req, res) => {
    const id = toId(req.params.id)
    const etat = id ? await releverMaintenant(id) : null
    if (!etat) {
      res.status(404)
      return { error: 'Cette machine n’est pas lue sur le réseau' }
    }
    if (!etat.enLigne) {
      res.status(502)
      return { error: etat.erreur ?? 'La machine ne répond pas' }
    }
    const [machine] = await toutesLesMachines(id)
    return { machine }
  }),
)

// « Remettre à zéro » : la page repart de zéro à partir des chiffres ACTUELS de la machine (qui, elle, n'est pas modifiée).
// La machine doit être joignable : on lit ses compteurs maintenant et on les garde comme point de départ. Réservé aux administrateurs.
router.post(
  '/machines/:id/remise-a-zero',
  requirePrivilege('administrer'),
  asyncJson(async (req, res) => {
    const id = toId(req.params.id)
    const etat = id ? await releverMaintenant(id) : null
    if (!etat) {
      res.status(404)
      return { error: 'Cette machine n’est pas lue sur le réseau' }
    }
    if (!etat.enLigne || !etat.lecture || etat.lecture.compteurs.TotalImpressions === null) {
      res.status(502)
      return { error: 'La machine doit être allumée et joignable pour remettre les compteurs à zéro (elle donne les chiffres de départ)' }
    }
    try {
      await query('INSERT INTO machine_remises_a_zero (machine_id, par, valeurs) VALUES (?, ?, ?)', [id, req.user.id, JSON.stringify(etat.lecture.compteurs)])
    } catch (err) {
      if (err?.code === 'ER_NO_SUCH_TABLE') {
        res.status(503)
        return { error: 'Table manquante : exécutez database/migration_remise_zero.sql' }
      }
      throw err
    }
    const [machine] = await toutesLesMachines(id)
    return { machine }
  }),
)

export default router
