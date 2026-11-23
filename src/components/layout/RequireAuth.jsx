import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Layout from './Layout.jsx'

// Toutes les pages de l'application passent par ici : sans session, retour à la connexion.
//   bare : page plein écran, sans menu latéral ni barre du haut (ex. fiche de création)
export default function RequireAuth({ bare = false }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-[24px] text-gaia-700/70">Chargement…</div>
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return bare ? <Outlet /> : <Layout />
}
