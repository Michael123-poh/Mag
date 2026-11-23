import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

const env = process.env
const isProd = env.NODE_ENV === 'production'

if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum) : voir server/.env.example')
}

export const config = {
  isProd,
  port: Number(env.PORT) || 3001,
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME || 'gaia',
  },
  jwtSecret: env.JWT_SECRET,
  sessionHours: 8,
  cookieName: 'gaia_session',
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  corsOrigin: env.CORS_ORIGIN || '',
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : 0,
  // Lecture des machines sur le réseau (SNMP, lecture seule)
  machines: {
    enabled: env.MACHINES_POLL !== 'off',
    snmpCommunity: env.SNMP_COMMUNITY || 'public', // « communauté » en lecture de la machine (réglage d'usine : public)
    pollSeconds: Math.min(3600, Math.max(5, Number(env.MACHINES_POLL_SECONDS) || 20)), // intervalle entre deux lectures
    saveEveryMinutes: Math.max(1, Number(env.RELEVE_MIN_MINUTES) || 5), // un relevé enregistré au plus toutes les X minutes
  },
  fixedToday: /^\d{4}-\d{2}-\d{2}$/.test(env.APP_TODAY || '') ? env.APP_TODAY : '',
}
