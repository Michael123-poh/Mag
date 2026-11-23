import snmp from 'net-snmp'

// Lecture d'une imprimante Xerox WorkCentre par SNMP (lecture seule : on ne modifie JAMAIS rien sur la machine).
//   - compteurs : table propre à Xerox (impressions imprimées / copiées, couleur / noir et blanc, feuilles recto verso, grands formats)
//   - magasins  : table standard « Printer MIB » (bacs : format, type et couleur du papier, niveau)
//   - toners    : table standard des consommables (niveau en %)
// Les OID ont été relevés sur la machine XEROX7835 (voir le tableau COMPTEURS ci-dessous).

const TIMEOUT_MS = 3000
const RETRIES = 1

const OID_NOM = '1.3.6.1.2.1.1.5.0' // sysName
const OID_SERIE = '1.3.6.1.2.1.43.5.1.1.17.1' // numéro de série
const OID_DESCRIPTION = '1.3.6.1.2.1.1.1.0' // sysDescr : « Xerox WorkCentre 7835 v1; … »
const OID_COMPTEUR_XEROX = '1.3.6.1.4.1.253.8.53.13.2.1.6.' // + service.20.numéro
const OID_MAGASINS = '1.3.6.1.2.1.43.8.2.1' // prtInputTable
const OID_CONSOMMABLES = '1.3.6.1.2.1.43.11.1.1' // prtMarkerSuppliesTable

// Nom du compteur dans l'application -> fin de l'OID chez Xerox
export const COMPTEURS = {
  TotalImpressions: '1.20.1',
  BlackPrintedImpressions: '1.20.7',
  BlackPrintedSheets: '1.20.8',
  BlackPrinted2SidedSheets: '1.20.9',
  BlackPrintedLargeSheets: '1.20.10',
  ColorPrintedImpressions: '1.20.29',
  ColorPrintedSheets: '1.20.30',
  ColorPrinted2SidedSheets: '1.20.31',
  ColorPrintedLargeSheets: '1.20.32',
  ColorImpressions: '1.20.33',
  BlackImpressions: '1.20.34',
  ColorLargeImpressions: '1.20.43',
  BlackLargeImpressions: '1.20.44',
  LargeImpressions: '1.20.47',
  BlackCopiedImpressions: '13.20.3',
  BlackCopiedSheets: '13.20.4',
  BlackCopied2SidedSheets: '13.20.5',
  BlackCopiedLargeSheets: '13.20.6',
  ColorCopiedImpressions: '13.20.25',
  ColorCopiedSheets: '13.20.26',
  ColorCopied2SidedSheets: '13.20.27',
  ColorCopiedLargeSheets: '13.20.28',
}

// Traduction des valeurs que la machine annonce
const FORMATS = { 'iso-a3': 'A3', 'iso-a4': 'A4', 'iso-a5': 'A5', 'iso-sra3': 'SRA3', 'iso-b4': 'B4', 'iso-b5': 'B5', 'na-letter': 'Letter', 'na-legal': 'Legal', 'na-ledger': 'Ledger' }
const TYPES = {
  standard: 'Standard',
  heavy: 'Épais',
  light: 'Léger',
  glossy: 'Glacé',
  extraheavyglossy: 'Glacé extra épais',
  heavyglossy: 'Glacé épais',
  recycled: 'Recyclé',
  transparency: 'Transparent',
  labels: 'Étiquettes',
  envelope: 'Enveloppe',
  letterhead: 'En-tête',
  preprinted: 'Préimprimé',
  cardstock: 'Carton',
}
const COULEURS = { white: 'Blanc', blue: 'Bleu', green: 'Vert', yellow: 'Jaune', pink: 'Rose', ivory: 'Ivoire', gray: 'Gris', buff: 'Chamois', goldenrod: 'Doré', orange: 'Orange', red: 'Rouge', purple: 'Violet', black: 'Noir' }
const TONERS = { Black: 'K', Cyan: 'C', Magenta: 'M', Yellow: 'Y' }

const text = (v) => (v === undefined || v === null ? null : Buffer.isBuffer(v) ? v.toString('utf8').trim() : String(v).trim())
const number = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const get = (session, oids) =>
  new Promise((resolve, reject) => session.get(oids, (err, varbinds) => (err ? reject(err) : resolve(varbinds))))
const table = (session, oid, columns) =>
  new Promise((resolve, reject) => session.tableColumns(oid, columns, 20, (err, rows) => (err ? reject(err) : resolve(rows))))

// Valeur d'un varbind, ou null s'il est absent / en erreur
const valueOf = (vb) => (!vb || snmp.isVarbindError(vb) ? null : vb.value)

// Dimension d'un bac : « A4 (210 x 297 mm) » (le plus petit côté d'abord)
function dimensionOf(row, formatName) {
  const unit = number(row[3]) // 3 = dix-millièmes de pouce, 4 = micromètres
  const toMm = (v) => (number(v) !== null && v > 0 ? Math.round(unit === 3 ? (v / 10000) * 25.4 : v / 1000) : null)
  const a = toMm(row[4])
  const b = toMm(row[5])
  const mm = a && b ? `${Math.min(a, b)} x ${Math.max(a, b)} mm` : null
  return [formatName, mm && (formatName ? `(${mm})` : mm)].filter(Boolean).join(' ') || null
}

// « Tray 5 (Bypass) » -> « Magasin 5 (départ manuel) »
const magasinName = (name, index) =>
  (name ?? `Tray ${index}`).replace(/^Tray\s+(\d+)/i, 'Magasin $1').replace(/\(Bypass\)/i, '(départ manuel)')

// Lit la machine et retourne { nom, serie, compteurs, magasins, toners }. Lève une erreur si la machine ne répond pas.
// creerSession : seulement pour les essais (une fausse machine) ; par défaut, la vraie connexion SNMP
export async function lireMachine({ adresse, communaute, creerSession = snmp.createSession }) {
  const session = creerSession(adresse, communaute, { version: snmp.Version2c, timeout: TIMEOUT_MS, retries: RETRIES })
  try {
    // 1. Identité et compteurs : une seule requête
    const noms = Object.keys(COMPTEURS)
    const vbs = await get(session, [OID_NOM, OID_SERIE, ...noms.map((n) => OID_COMPTEUR_XEROX + COMPTEURS[n]), OID_DESCRIPTION])
    const compteurs = Object.fromEntries(noms.map((n, i) => [n, number(valueOf(vbs[2 + i]))]))

    // 2. Magasins (bacs à papier) : si cette table échoue, on garde le reste
    let magasins = []
    try {
      const rows = await table(session, OID_MAGASINS, [3, 4, 5, 9, 10, 12, 13, 21, 22])
      magasins = Object.entries(rows)
        .map(([key, row]) => ({ index: Number(key.split('.').pop()), row }))
        .sort((a, b) => a.index - b.index)
        .map(({ index, row }) => {
          const format = text(row[12])
          const capacite = number(row[9])
          const niveau = number(row[10])
          const type = text(row[21])
          const couleur = text(row[22])
          return {
            nom: magasinName(text(row[13]), index),
            type: type ? (TYPES[type] ?? capitalise(type)) : null,
            couleur: couleur ? (COULEURS[couleur] ?? capitalise(couleur)) : null,
            dimension: dimensionOf(row, FORMATS[format] ?? (format ? format.replace(/^[a-z]+-/, '').toUpperCase() : null)),
            capacite: capacite !== null && capacite > 0 ? capacite : null,
            niveau: niveau !== null && niveau >= 0 ? niveau : null, // les valeurs négatives veulent dire « inconnu »
          }
        })
    } catch {
      /* table des magasins indisponible */
    }

    // 3. Toners : niveau en %
    const toners = {}
    try {
      const rows = await table(session, OID_CONSOMMABLES, [6, 8, 9])
      for (const row of Object.values(rows)) {
        const nom = text(row[6]) ?? ''
        const couleur = Object.keys(TONERS).find((c) => nom.startsWith(`${c} Toner`))
        const max = number(row[8])
        const niveau = number(row[9])
        if (couleur && max > 0 && niveau !== null && niveau >= 0) toners[TONERS[couleur]] = Math.max(0, Math.min(100, Math.round((niveau / max) * 100)))
      }
    } catch {
      /* table des consommables indisponible */
    }

    const description = text(valueOf(vbs[2 + noms.length]))
    return { nom: text(valueOf(vbs[0])), serie: text(valueOf(vbs[1])), modele: description ? description.split(';')[0].trim() : null, compteurs, magasins, toners }
  } finally {
    session.close()
  }
}
