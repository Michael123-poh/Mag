const MOIS = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
const nf = new Intl.NumberFormat('fr-FR')

// 1250000 -> "1 250 000"
export const fmtMoney = (n) => nf.format(Math.round(Number(n) || 0))

// "2026-10-22" ou "2026-10-22 16:30:00" -> "22 Oct 2026"
export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d} ${MOIS[Number(m) - 1]} ${y}`
}

// "2026-10-22" -> "22 Oct"
export function fmtDay(iso) {
  if (!iso) return '—'
  const [, m, d] = String(iso).slice(0, 10).split('-')
  return `${d} ${MOIS[Number(m) - 1]}`
}

// "2026-10-29" -> "Jeudi 29 octobre 2026"
export function fmtDateLong(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "2026-10-29 10:30:00" -> "10:30"
export const fmtTime = (stamp) => (stamp ? String(stamp).slice(11, 16) : '')

export const firstName = (full) => String(full ?? '').split(' ')[0]
