import { config } from '../config.js'
import { queryOne } from '../db.js'

// Réglages de la lecture des machines, modifiables depuis la page Paramètre (table « parametres »).
// À défaut, les valeurs du fichier .env (ou 20 secondes et 5 minutes).
export const LIMITES = { intervalle: [5, 3600], releve: [1, 1440] }
const borne = (v, [min, max], defaut) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut)

async function valeur(cle) {
  try {
    const row = await queryOne('SELECT valeur FROM parametres WHERE cle = ?', [cle])
    return row ? Number(row.valeur) : NaN
  } catch {
    return NaN
  }
}

export async function reglagesMachines() {
  return {
    intervalle: borne(await valeur('machines_intervalle_secondes'), LIMITES.intervalle, config.machines.pollSeconds),
    releveMinutes: borne(await valeur('machines_releve_minutes'), LIMITES.releve, config.machines.saveEveryMinutes),
  }
}
