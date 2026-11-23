import { config } from './config.js'

// ----- Dates (toutes au format texte AAAA-MM-JJ) -------------------------------------------------
export function today() {
  return config.fixedToday || new Date().toLocaleDateString('en-CA')
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const monthStart = (iso) => `${iso.slice(0, 7)}-01`

export function addMonths(iso, n) {
  const d = new Date(`${monthStart(iso)}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

export const monthEnd = (iso) => addDays(addMonths(iso, 1), -1)
export const yearStart = (iso) => `${iso.slice(0, 4)}-01-01`

export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

// Lundi de la semaine qui contient la date donnée
export function mondayOf(iso) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay() // 0 = dimanche
  return addDays(iso, -((day + 6) % 7))
}

// ----- Divers --------------------------------------------------------------------------------------
const TONES = ['teal', 'cream', 'orange', 'dark']
export const toneOf = (id) => TONES[Math.abs(Number(id) || 0) % TONES.length]

export const firstName = (full) => String(full ?? '').split(' ')[0]

// Entier positif issu de l'URL, sinon null
export function toId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 && n < 2_147_483_647 ? n : null
}

export const asyncJson = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req, res))
  } catch (err) {
    next(err)
  }
}
