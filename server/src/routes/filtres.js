import { Router } from 'express'
import { z } from 'zod'
import { PRIVILEGE, SCHEMAS, isMissingTable, saveCard } from '../cards.js'

const router = Router()

// Enregistre le filtre personnalisé d'une carte (page = clients | prestations, slot = 0, 1 ou 2)
router.put('/:page/:slot', async (req, res, next) => {
  try {
    const page = req.params.page
    if (!Object.hasOwn(SCHEMAS, page)) return res.status(404).json({ error: 'Page inconnue' })

    const have = req.user.privileges
    if (!have.includes('administrer') && !have.includes(PRIVILEGE[page])) {
      return res.status(403).json({ error: 'Droits insuffisants pour cette rubrique' })
    }

    const slot = Number(req.params.slot)
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return res.status(400).json({ error: 'Carte invalide' })

    const parsed = z.object({ filtres: SCHEMAS[page] }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Filtre invalide' })

    try {
      await saveCard(req.user.id, page, slot, parsed.data.filtres)
    } catch (err) {
      if (isMissingTable(err)) {
        return res.status(503).json({ error: "La table « filtres_cartes » n'existe pas encore : exécutez database/migration_filtres.sql" })
      }
      throw err
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
