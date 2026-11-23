import { config } from '../config.js'
import { pool, query, queryOne } from '../db.js'
import { reglagesMachines } from './reglages.js'
import { lireMachine } from './xerox.js'

// Lecture continue des machines branchées au réseau (protocole « snmp »).
//
//   - Toutes les `pollSeconds` secondes (20 par défaut), chaque machine est interrogée ; la dernière lecture reste EN MÉMOIRE
//     et alimente la page Rapport en direct.
//   - On n'enregistre PAS un relevé toutes les 20 secondes (des milliers de lignes par jour) : un relevé n'est enregistré que si le compteur
//     total a changé depuis le dernier relevé ET qu'au moins `saveEveryMinutes` minutes se sont écoulées (ou à la demande : « Relever maintenant »).
//   - Les magasins (bacs à papier) annoncés par la machine mettent à jour la table machine_magasins quand ils changent.
//   - L'heure est celle du serveur (l'horloge de la machine indique l'an 2000).

// Lecteur utilisé : la vraie lecture SNMP (remplaçable seulement pour les essais)
let lecteur = lireMachine
export const lecteurDeTest = (fn) => {
  lecteur = fn
}

const etats = new Map() // identifiant de la machine -> état de sa dernière lecture
let timer = null
let actif = false
let enCours = false
let reglages = { intervalle: config.machines.pollSeconds, releveMinutes: config.machines.saveEveryMinutes }

// Ce qui est enregistré dans un relevé : le total (code déjà utilisé) + chaque compteur Xerox + le niveau des toners
function valeursDuReleve(lecture) {
  const valeurs = []
  for (const [nom, v] of Object.entries(lecture.compteurs)) if (v !== null) valeurs.push([`Xerox.${nom}`, v])
  if (lecture.compteurs.TotalImpressions !== null) valeurs.push(['Counter.TotalImpressions', lecture.compteurs.TotalImpressions])
  for (const [couleur, pct] of Object.entries(lecture.toners)) valeurs.push([`Toner.${couleur}`, pct])
  return valeurs
}

async function enregistrerReleve(machineId, lecture) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [ins] = await conn.execute("INSERT INTO releves_machine (machine_id, source, brut) VALUES (?, 'snmp', ?)", [machineId, JSON.stringify(lecture)])
    const valeurs = valeursDuReleve(lecture)
    if (valeurs.length) {
      await conn.execute(
        `INSERT INTO releve_valeurs (releve_id, code, valeur) VALUES ${valeurs.map(() => '(?, ?, ?)').join(', ')}`,
        valeurs.flatMap(([code, v]) => [ins.insertId, code, v]),
      )
    }
    await conn.execute('UPDATE machines SET derniere_lecture_at = NOW() WHERE id = ?', [machineId])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// Magasins annoncés par la machine -> table machine_magasins (réécrite seulement si elle diffère)
const signature = (magasins) => JSON.stringify(magasins.map((m) => [m.nom, m.type, m.couleur, m.dimension]))

async function synchroniserMagasins(machineId, magasins, etat) {
  if (magasins.length === 0) return
  const sig = signature(magasins)
  if (etat.signatureMagasins === sig) return
  const actuels = await query('SELECT nom, type_papier, couleur, dimension FROM machine_magasins WHERE machine_id = ? ORDER BY position, id', [machineId])
  if (signature(actuels.map((m) => ({ nom: m.nom, type: m.type_papier, couleur: m.couleur, dimension: m.dimension }))) !== sig) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute('DELETE FROM machine_magasins WHERE machine_id = ?', [machineId])
      for (let i = 0; i < magasins.length; i++) {
        const m = magasins[i]
        await conn.execute('INSERT INTO machine_magasins (machine_id, nom, type_papier, couleur, dimension, position) VALUES (?, ?, ?, ?, ?, ?)', [machineId, m.nom, m.type, m.couleur, m.dimension, i + 1])
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }
  etat.signatureMagasins = sig
}

// Dernier relevé enregistré (heure et total), pour décider quand en enregistrer un nouveau
async function dernierReleve(machineId) {
  const row = await queryOne(
    `SELECT r.releve_le AS le, v.valeur AS total
       FROM releves_machine r LEFT JOIN releve_valeurs v ON v.releve_id = r.id AND v.code = 'Counter.TotalImpressions'
      WHERE r.machine_id = ? AND r.source = 'snmp' ORDER BY r.releve_le DESC, r.id DESC LIMIT 1`,
    [machineId],
  )
  return row ? { au: Date.parse(String(row.le).replace(' ', 'T')), total: row.total } : { au: 0, total: null }
}

// Lit une machine et met à jour son état. forcer = enregistrer un relevé quoi qu'il arrive.
async function lire(machine, { forcer = false } = {}) {
  const etat = etats.get(machine.id) ?? { enLigne: null, erreur: null, lecture: null, lectureLe: null, enregistre: null, signatureMagasins: null }
  etats.set(machine.id, etat)
  try {
    const lecture = await lecteur({ adresse: machine.adresse, communaute: config.machines.snmpCommunity })
    Object.assign(etat, { enLigne: true, erreur: null, lecture, lectureLe: new Date() })

    try {
      etat.enregistre ??= await dernierReleve(machine.id)
      const total = lecture.compteurs.TotalImpressions
      const change = total !== null && total !== etat.enregistre.total
      const assezTard = Date.now() - etat.enregistre.au >= reglages.releveMinutes * 60_000
      if (forcer || (change && assezTard)) {
        await enregistrerReleve(machine.id, lecture)
        etat.enregistre = { au: Date.now(), total }
      }
      await synchroniserMagasins(machine.id, lecture.magasins, etat)
    } catch (err) {
      console.error(`[machines] enregistrement impossible (${machine.nom}) :`, err.message) // la lecture en direct reste valable
    }
  } catch (err) {
    etat.enLigne = false
    etat.erreur = err?.message?.includes('Request timed out') ? 'La machine ne répond pas' : (err?.message ?? 'Lecture impossible')
  }
  return etat
}

const machinesLues = () =>
  query("SELECT id, nom, adresse_reseau AS adresse FROM machines WHERE actif = 1 AND protocole = 'snmp' AND adresse_reseau IS NOT NULL AND adresse_reseau <> ''")

// Un tour de lecture, puis le suivant après l'intervalle réglé dans Paramètre (relu à chaque tour : un changement s'applique tout de suite)
async function cycle() {
  if (!actif) return
  if (!enCours) {
    enCours = true // la lecture précédente n'est pas finie : on ne les empile pas
    try {
      reglages = await reglagesMachines()
      await Promise.allSettled((await machinesLues()).map((m) => lire(m)))
    } catch (err) {
      console.error('[machines] cycle de lecture :', err.message)
    } finally {
      enCours = false
    }
  }
  if (actif) timer = setTimeout(cycle, reglages.intervalle * 1000)
}

export function demarrerLecture() {
  if (actif) return
  actif = true
  console.log('[machines] lecture SNMP en continu (intervalle et fréquence des relevés : page Paramètre)')
  cycle()
}

export function arreterLecture() {
  actif = false
  clearTimeout(timer)
  timer = null
}

// Dernière lecture connue d'une machine (ou undefined)
export const etatMachine = (id) => etats.get(id)

// « Relever maintenant » : lit la machine tout de suite et enregistre un relevé
export async function releverMaintenant(id) {
  const machine = (await machinesLues()).find((m) => m.id === id)
  if (!machine) return null
  return lire(machine, { forcer: true })
}
