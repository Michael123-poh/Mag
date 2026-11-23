import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import FactureA4 from '../components/factures/FactureA4.jsx'
import FactureTicket from '../components/factures/FactureTicket.jsx'

// Télécharge une facture en PDF : le document (feuille A4 ou ticket 80 mm) est dessiné hors de l'écran, photographié, puis placé dans un PDF.
// Le PDF est donc identique à ce qu'on voit à l'écran. Les bibliothèques (html-to-image, jsPDF) ne sont chargées qu'au premier téléchargement.
//   data   : la réponse de GET /api/factures/:id
//   format : 'a4' (une ou plusieurs pages A4) ou 'ticket' (une page de 80 mm de large, de la hauteur du ticket)
// Retourne le nom du fichier : « FA-2026-0153.pdf » (A4) ou « FA-2026-0153-ticket.pdf ».

// Polices : html-to-image ne peut pas lire la feuille de style de Google Fonts (autre site). On la récupère nous-mêmes et on place
// les polices (Anton, Barlow Condensed, Acumin) dans le dessin sous forme de données : sans cela, le PDF afficherait d'autres polices.
let fontCssPromise
const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

async function inlineUrls(css) {
  const urls = [...new Set([...css.matchAll(/url\(["']?(https?:[^)"']+)["']?\)/g)].map((m) => m[1]))]
  const data = await Promise.all(urls.map(async (u) => [u, await toDataUrl(await (await fetch(u)).blob())]))
  return data.reduce((out, [u, d]) => out.split(u).join(d), css)
}

function fontEmbedCss() {
  fontCssPromise ??= (async () => {
    try {
      const parts = []
      const google = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href).find((h) => h.includes('fonts.googleapis.com'))
      if (google) {
        const css = await (await fetch(google)).text()
        // on ne garde que les caractères latins (français compris) de chaque police
        const latin = css.split('@font-face').filter((b) => b.includes('U+0000-00FF')).map((b) => `@font-face${b}`)
        parts.push(await inlineUrls(latin.join('\n')))
      }
      const acumin = await (await fetch('/fonts/AcuminVariableConcept.otf')).blob()
      parts.push(`@font-face { font-family: "Acumin Variable Concept"; font-weight: 100 900; font-stretch: 50% 115%; src: url(${await toDataUrl(acumin)}) format("opentype"); }`)
      return parts.join('\n')
    } catch {
      fontCssPromise = undefined // hors ligne : on réessaiera la prochaine fois, et le PDF utilisera les polices disponibles
      return undefined
    }
  })()
  return fontCssPromise
}

const PX_PER_MM = 96 / 25.4
const A4 = { w: 210, h: 297 }
const TICKET_PAGE_W = 80 // largeur du rouleau (le ticket, large de 72 mm, est centré dessus)

export async function telechargerFacture(data, format) {
  const ticket = format === 'ticket'
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${ticket ? 100 : 230}mm;pointer-events:none;`
  document.body.append(host)
  const root = createRoot(host)

  try {
    flushSync(() =>
      root.render(
        <div className="fd-page" style={{ padding: 0, minHeight: 0, background: '#fff' }}>
          {ticket ? <FactureTicket data={data} /> : <FactureA4 data={data} />}
        </div>,
      ),
    )
    await document.fonts.ready
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))) // la mise en page se stabilise

    const node = host.querySelector(ticket ? '.tk-ticket' : '.fd-sheet')
    Object.assign(node.style, { zoom: '1', boxShadow: 'none', borderRadius: '0', margin: '0' })

    const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
    const options = { pixelRatio: ticket ? 3 : 2.5, backgroundColor: '#ffffff', fontEmbedCSS: await fontEmbedCss() }
    // html-to-image recopie la largeur exacte de chaque élément ; un texte qui s'ajuste à son contenu (numéro, montants…)
    // reçoit donc une largeur sans aucune marge et risque de passer à la ligne dans le dessin. On lui laisse 2 px de jeu.
    for (const el of node.querySelectorAll('*')) {
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) el.style.minWidth = `${Math.ceil(el.getBoundingClientRect().width) + 2}px`
    }
    const canvas = await toCanvas(node, options)
    const box = node.getBoundingClientRect()
    const ratio = canvas.width / box.width // pixels du dessin par pixel de mise en page

    // Découpe en pages : une seule pour le ticket ; pour l'A4, on coupe à la fin d'une section, d'un cadre ou d'une ligne (jamais au milieu)
    let pages
    if (ticket) {
      pages = [[0, box.height]]
    } else {
      const pageH = (box.width * A4.h) / A4.w
      const cuts = [...node.querySelectorAll('.fd-head, .fd-meta, .fd-section, .fd-group, .fd-table tbody tr, .fd-sign')].map((el) => el.getBoundingClientRect().bottom - box.top)
      pages = []
      for (let start = 0; start < box.height - 1; ) {
        let end = Math.min(start + pageH, box.height)
        if (end < box.height) end = cuts.filter((c) => c > start + pageH * 0.5 && c <= end).sort((a, b) => b - a)[0] ?? end
        pages.push([start, end])
        start = end
      }
    }

    const widthMm = box.width / PX_PER_MM
    const pageSize = ticket ? [TICKET_PAGE_W, Math.ceil(box.height / PX_PER_MM) + 2] : [A4.w, A4.h]
    const pdf = new jsPDF({ unit: 'mm', format: pageSize, orientation: 'portrait', compress: true })
    pages.forEach(([start, end], i) => {
      if (i > 0) pdf.addPage(pageSize)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = Math.max(1, Math.round((end - start) * ratio))
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, Math.round(start * ratio), canvas.width, slice.height, 0, 0, slice.width, slice.height)
      const x = ticket ? (TICKET_PAGE_W - widthMm) / 2 : 0
      pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', x, 0, widthMm, (end - start) / PX_PER_MM)
    })

    const nom = `${data.facture.numero}${ticket ? '-ticket' : ''}.pdf`
    pdf.save(nom)
    return nom
  } finally {
    root.unmount()
    host.remove()
  }
}
