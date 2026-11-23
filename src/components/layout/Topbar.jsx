import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Plus, Search, User } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'

function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-12 items-center justify-center rounded-full bg-white text-gaia-900 transition-colors hover:bg-gaia-200/60"
      {...props}
    >
      {children}
    </button>
  )
}

// Ferme un menu déroulant au clic à l'extérieur ou à la touche Échap
function useDismiss(open, setOpen) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open, setOpen])

  return ref
}

// Raccourcis de création (« to » absent : le formulaire correspondant sera branché ensuite)
const NEW_ITEMS = [
  { label: 'Nouveau Client', to: '/clients/nouveau' },
  { label: 'Nouvelle Prestation', to: '/prestations/nouveau' },
  { label: 'Nouveau Projet', to: '/projets/nouveau' },
  { label: 'Nouvelle Facture' },
  { label: 'Nouvelle Machine' },
  { label: 'Entrée de Stock', to: '/stock/nouveau' },
]

function NewMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, setOpen)

  return (
    <div ref={ref} className="relative">
      <IconButton label="Nouveau" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus size={28} strokeWidth={2.6} />
      </IconButton>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 min-w-[240px] rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
          {NEW_ITEMS.map(({ label, to }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                if (to) navigate(to)
              }}
              className="block w-full rounded-lg px-3 py-1.5 text-left text-[20px] leading-tight text-gaia-900 hover:bg-surface"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, setOpen)

  return (
    <div ref={ref} className="relative">
      <IconButton label="Profil" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <User size={24} strokeWidth={2.6} fill="currentColor" />
      </IconButton>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 min-w-[240px] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5">
          <p className="px-2 text-[20px] font-medium leading-tight">{user?.nom}</p>
          <p className="px-2 pb-2 text-[15px] leading-tight text-gaia-700/60">{user?.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg border-t border-black/10 px-2 pt-2 text-left text-[18px] text-danger hover:bg-surface"
          >
            <LogOut size={16} strokeWidth={2.2} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

export default function Topbar() {
  return (
    <header className="flex items-center justify-between gap-4 rounded-[28px] bg-surface px-7 py-5">
      <label className="flex w-full max-w-[304px] items-center gap-3 rounded-full bg-white px-4 py-2.5">
        <Search size={28} strokeWidth={2.2} />
        <input
          type="search"
          placeholder="Recherche..."
          className="w-full bg-transparent text-[26px] leading-none outline-none placeholder:text-muted"
        />
      </label>

      <div className="flex items-center gap-5">
        <NewMenu />
        <IconButton label="Notifications">
          <Bell size={24} strokeWidth={2} />
        </IconButton>
        <ProfileMenu />
      </div>
    </header>
  )
}
