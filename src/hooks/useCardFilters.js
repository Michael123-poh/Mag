import { useState } from 'react'
import { api } from '../api/client.js'

// Gestion des cartes « dossier » filtrantes (pages Clients et Prestations).
//  - chaque carte porte un filtre PERSONNALISÉ, enregistré pour l'employé (jusqu'à ce qu'il le change) ;
//  - cliquer sur la carte applique ce filtre au tableau (un second clic l'enlève) ;
//  - la languette « Filtrer » ouvre le pop-up pour modifier le filtre de la carte ; « Appliquer » l'enregistre.
export function useCardFilters({ page, defaultFilters }) {
  const [applied, setApplied] = useState(defaultFilters) // filtre actuellement appliqué au tableau
  const [active, setActive] = useState(null) // carte dont le filtre est appliqué au tableau
  const [open, setOpen] = useState(null) // carte dont le pop-up est ouvert
  const [filters, setFilters] = useState(defaultFilters) // choix en cours dans le pop-up
  const [saveError, setSaveError] = useState('')
  const isFiltered = JSON.stringify(applied) !== JSON.stringify(defaultFilters)

  const selectCard = (i, cartes) => {
    const same = active === i
    setApplied(same ? defaultFilters : cartes[i].filters)
    setActive(same ? null : i)
  }

  const openFilters = (i, cartes) => {
    setFilters(cartes[i].filters)
    setSaveError('')
    setOpen(i)
  }

  const clear = () => {
    setApplied(defaultFilters)
    setActive(null)
  }

  // Enregistre le filtre de la carte ouverte ; si elle est active, le tableau suit son nouveau filtre
  const save = async (reload) => {
    const slot = open
    try {
      await api(`/filtres/${page}/${slot}`, { method: 'PUT', body: { filtres: filters } })
    } catch (err) {
      setSaveError(err.message)
      return
    }
    setOpen(null)
    if (active === slot) setApplied(filters)
    reload()
  }

  return { applied, active, open, setOpen, filters, setFilters, saveError, isFiltered, selectCard, openFilters, clear, save }
}
