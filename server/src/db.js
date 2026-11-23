import mysql from 'mysql2/promise'
import { config } from './config.js'

// Dates renvoyées en texte ("2026-10-27"), montants (DECIMAL) renvoyés en nombres.
export const pool = mysql.createPool({
  ...config.db,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
  multipleStatements: false,
})

// Toutes les requêtes passent par ici : valeurs toujours transmises en paramètres (jamais collées dans le SQL).
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] ?? null
}
