// Ce que la machine compte, et ce que la page Rapport en tire (en IMPRESSIONS : une feuille recto verso = 2 impressions).
//   - imprimé / copie : la machine les sépare (noir + couleur de chacun)
//   - couleur / noir et blanc : directement
//   - grands formats (A3 et plus) : directement ; petits formats (A4, A5) = total moins grands formats
//   - recto verso : la machine donne les FEUILLES recto verso (chacune = 2 impressions), et le nombre de grandes feuilles ;
//     les feuilles recto verso des grands formats = grandes impressions - grandes feuilles (une impression de plus par feuille recto verso)
const somme = (...v) => (v.some((x) => x === null || x === undefined) ? null : v.reduce((n, x) => n + x, 0))
const moins = (a, b) => (a === null || a === undefined || b === null || b === undefined ? null : a - b)

export function ventiler(c) {
  if (!c) return null
  const feuillesGrandes = somme(c.BlackPrintedLargeSheets, c.ColorPrintedLargeSheets, c.BlackCopiedLargeSheets, c.ColorCopiedLargeSheets)
  const rvFeuilles = somme(c.BlackPrinted2SidedSheets, c.ColorPrinted2SidedSheets, c.BlackCopied2SidedSheets, c.ColorCopied2SidedSheets)
  const rvFeuillesGrandes = moins(c.LargeImpressions, feuillesGrandes)
  const rvGrandes = rvFeuillesGrandes === null ? null : rvFeuillesGrandes * 2
  const rvTotal = rvFeuilles === null ? null : rvFeuilles * 2
  const total = c.TotalImpressions ?? null
  const grandes = c.LargeImpressions ?? null

  const petits = {
    impressions: moins(total, grandes),
    couleur: moins(c.ColorImpressions, c.ColorLargeImpressions),
    nb: moins(c.BlackImpressions, c.BlackLargeImpressions),
    rectoVerso: moins(rvTotal, rvGrandes),
  }
  petits.recto = moins(petits.impressions, petits.rectoVerso)
  const grands = { impressions: grandes, couleur: c.ColorLargeImpressions ?? null, nb: c.BlackLargeImpressions ?? null, rectoVerso: rvGrandes }
  grands.recto = moins(grandes, rvGrandes)
  const ensemble = { impressions: total, couleur: c.ColorImpressions ?? null, nb: c.BlackImpressions ?? null, rectoVerso: rvTotal, recto: moins(total, rvTotal) }

  return {
    imprime: somme(c.BlackPrintedImpressions, c.ColorPrintedImpressions),
    copie: somme(c.BlackCopiedImpressions, c.ColorCopiedImpressions),
    petits,
    grands,
    ensemble,
  }
}

