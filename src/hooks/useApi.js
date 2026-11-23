import { useEffect, useState } from 'react'
import { api } from '../api/client.js'

// Charge une ressource GET. Retourne { data, error, loading, reload }.
// keepPrevious : pendant un rechargement (ex. nouveau filtre), garde l'ancien résultat affiché au lieu de vider la page.
export function useApi(path, { keepPrevious = false } = {}) {
  const [tick, setTick] = useState(0)
  const key = `${path}#${tick}`
  const [res, setRes] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    const ctrl = new AbortController()
    api(path, { signal: ctrl.signal })
      .then((data) => setRes({ key, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setRes((prev) => ({ key, data: keepPrevious ? prev.data : null, error }))
      })
    return () => ctrl.abort()
  }, [path, key, keepPrevious])

  const current = res.key === key
  return {
    data: current || keepPrevious ? res.data : null,
    error: current ? res.error : null,
    loading: !current,
    reload: () => setTick((t) => t + 1),
  }
}
