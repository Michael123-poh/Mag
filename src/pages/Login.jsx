import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import './login.css'
import { useAuth } from '../auth/useAuth.js'

export default function Login() {
  const { user, status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'ready' && user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form onSubmit={submit} className="lg-card w-full rounded-[28px] bg-white p-8" noValidate>
        <h1 className="t lg-logo text-center text-gaia-700">GAIA</h1>
        <p className="t lg-subtitle mt-1 text-center text-gaia-700/70">Connexion à votre espace</p>

        <label className="mt-6 block">
          <span className="t lg-label text-gaia-700/70">Adresse email</span>
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={160}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="t lg-input mt-1 w-full rounded-xl bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-gaia-500"
          />
        </label>

        <label className="mt-4 block">
          <span className="t lg-label text-gaia-700/70">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="t lg-input mt-1 w-full rounded-xl bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-gaia-500"
          />
        </label>

        {error && (
          <p role="alert" className="t lg-error mt-4 text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-gaia-700 py-2 text-white transition-opacity disabled:opacity-60"
        >
          <span className="t lg-button">{busy ? 'Connexion…' : 'Se connecter'}</span>
        </button>
      </form>
    </main>
  )
}
