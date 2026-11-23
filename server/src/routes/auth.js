import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import { queryOne } from '../db.js'
import { loadUser, requireAuth, signSession } from '../middleware/auth.js'

const router = Router()

// 10 tentatives de connexion échouées par quart d'heure et par adresse
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(200),
})

// Hash factice : on compare toujours un mot de passe, même si l'email n'existe pas (pas de fuite par le temps de réponse)
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 10)

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Email ou mot de passe invalide' })
  const { email, password } = parsed.data

  const row = await queryOne('SELECT id, mot_de_passe_hash, actif FROM employes WHERE email = ?', [email])
  const ok = await bcrypt.compare(password, row?.mot_de_passe_hash ?? DUMMY_HASH)
  if (!row || !row.actif || !ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

  signSession(res, row.id)
  res.json({ user: await loadUser(row.id) })
})

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { path: '/' })
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
