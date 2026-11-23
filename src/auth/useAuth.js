import { useContext } from 'react'
import { AuthContext } from './authContext.js'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}

// Vrai si l'employé a ce droit (ou « administrer »). Sans code : toujours vrai.
export function useCan() {
  const { user } = useAuth()
  const have = user?.privileges ?? []
  return (code) => !code || have.includes('administrer') || have.includes(code)
}
