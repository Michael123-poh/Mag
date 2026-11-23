import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { pool } from './db.js'
import { arreterLecture, demarrerLecture } from './machines/poller.js'
import { csrfGuard, requireAuth, requirePrivilege } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import caisseRoutes from './routes/caisse.js'
import clientsRoutes from './routes/clients.js'
import dashboardRoutes from './routes/dashboard.js'
import facturesRoutes from './routes/factures.js'
import filtresRoutes from './routes/filtres.js'
import prestationsRoutes from './routes/prestations.js'
import parametresRoutes from './routes/parametres.js'
import projetsRoutes from './routes/projets.js'
import rapportsRoutes from './routes/rapports.js'
import stockRoutes from './routes/stock.js'

const app = express()

app.disable('x-powered-by')
if (config.trustProxy) app.set('trust proxy', config.trustProxy)

app.use(helmet())
if (config.corsOrigin) app.use(cors({ origin: config.corsOrigin, credentials: true }))
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

// Limite générale : 300 requêtes par minute et par adresse
app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api', csrfGuard)

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)

// Tout le reste exige une session ; chaque rubrique exige en plus un droit.
app.use('/api/dashboard', requireAuth, dashboardRoutes)
app.use('/api/filtres', requireAuth, filtresRoutes)
app.use('/api/clients', requireAuth, requirePrivilege('gerer_clients'), clientsRoutes)
app.use('/api/prestations', requireAuth, requirePrivilege('gerer_prestations'), prestationsRoutes)
app.use('/api/projets', requireAuth, requirePrivilege('gerer_projets'), projetsRoutes)
app.use('/api/stock', requireAuth, requirePrivilege('gerer_stock'), stockRoutes)
app.use('/api/caisse', requireAuth, requirePrivilege('gerer_caisse'), caisseRoutes)
app.use('/api/factures', requireAuth, requirePrivilege('gerer_factures'), facturesRoutes)
app.use('/api/rapports', requireAuth, requirePrivilege('voir_rapports'), rapportsRoutes)
app.use('/api/parametres', requireAuth, requirePrivilege('administrer'), parametresRoutes)

app.use('/api', (req, res) => res.status(404).json({ error: 'Introuvable' }))

// Les erreurs internes ne sont jamais détaillées au client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide' })
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse' })
  console.error(err)
  res.status(500).json({ error: 'Erreur interne du serveur' })
})

const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`API GAIA sur http://127.0.0.1:${config.port}`)
  if (config.machines.enabled) demarrerLecture()
})

function shutdown() {
  arreterLecture()
  server.close(() => pool.end().finally(() => process.exit(0)))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
