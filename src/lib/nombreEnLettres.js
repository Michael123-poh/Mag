// Nombre entier en lettres, en français : 65000 -> « soixante-cinq mille », 280000 -> « deux cent quatre-vingt mille ».
// Sert à la phrase « Arrêtée la présente facture à la somme de … » du modèle de facture.

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

// 0 à 99 ; « quatre-vingts » prend son s seulement quand rien ne le suit (accorde = true)
function sousCent(n, accorde) {
  if (n < 20) return UNITES[n]
  if (n < 70) {
    const d = Math.floor(n / 10)
    const u = n % 10
    return DIZAINES[d] + (u === 1 ? ' et un' : u ? `-${UNITES[u]}` : '')
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${UNITES[n - 60]}`
  return n === 80 ? `quatre-vingt${accorde ? 's' : ''}` : `quatre-vingt-${UNITES[n - 80]}`
}

// 1 à 999 ; « cents » et « quatre-vingts » prennent leur s seulement quand rien ne les suit (accorde = true)
function sousMille(n, accorde) {
  const c = Math.floor(n / 100)
  const r = n % 100
  let texte = ''
  if (c > 0) texte = (c === 1 ? 'cent' : `${UNITES[c]} cent`) + (c > 1 && r === 0 && accorde ? 's' : '')
  if (r > 0) texte += (texte ? ' ' : '') + sousCent(r, accorde)
  return texte
}

export function nombreEnLettres(valeur) {
  let n = Math.floor(Math.abs(Number(valeur) || 0))
  if (n === 0) return 'zéro'

  const milliards = Math.floor(n / 1e9)
  n %= 1e9
  const millions = Math.floor(n / 1e6)
  n %= 1e6
  const milliers = Math.floor(n / 1e3)
  const reste = n % 1e3

  const parts = []
  if (milliards) parts.push(`${sousMille(milliards, true)} milliard${milliards > 1 ? 's' : ''}`)
  if (millions) parts.push(`${sousMille(millions, true)} million${millions > 1 ? 's' : ''}`)
  if (milliers) parts.push(milliers === 1 ? 'mille' : `${sousMille(milliers, false)} mille`)
  if (reste) parts.push(sousMille(reste, true))
  return parts.join(' ')
}
