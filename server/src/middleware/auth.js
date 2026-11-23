import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query, queryOne } from '../db.js'

export async function loadUser(id) {
  const user = await queryOne('SELECT id, nom, email, actif FROM employes WHERE id = ?', [id])
  if (!user || !user.actif) return null
  const rows = await query(
    'SELECT p.code FROM employe_privileges ep JOIN privileges p ON p.id = ep.privilege_id WHERE ep.employe_id = ?',
    [id],
  )
  return { id: user.id, nom: user.nom, email: user.email, privileges: rows.map((r) => r.code) }
}

// Exige une session valide ; recharge l'employé à chaque requête (droits retirés = effet immédiat).
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[config.cookieName]
    if (!token) return res.status(401).json({ error: 'Non connecté' })
    let payload
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    } catch {
      return res.status(401).json({ error: 'Session expirée' })
    }
    const user = await loadUser(Number(payload.sub))
    if (!user) return res.status(401).json({ error: 'Session invalide' })
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

// Autorise si l'employé a l'un des privilèges demandés (ou « administrer »).
export const requirePrivilege =
  (...codes) =>
  (req, res, next) => {
    const have = req.user?.privileges ?? []
    if (have.includes('administrer') || codes.some((c) => have.includes(c))) return next()
    res.status(403).json({ error: "Droits insuffisants pour cette rubrique" })
  }

// Protection contre les requêtes envoyées depuis un autre site : toute écriture doit porter cet en-tête personnalisé.
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('X-Requested-With') !== 'gaia') return res.status(403).json({ error: 'Requête refusée' })
  next()
}

export function signSession(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.sessionHours}h`,
  })
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionHours * 3_600_000,
    path: '/',
  })
}
