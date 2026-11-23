import { NavLink } from 'react-router-dom'
import { useCan } from '../../auth/useAuth.js'
import {
  BarChart3,
  Boxes,
  CircleHelp,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Printer,
  Settings,
  User,
} from 'lucide-react'

const sections = [
  {
    label: 'Principal',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Activité',
    items: [
      { to: '/clients', label: 'Client', icon: User, privilege: 'gerer_clients' },
      { to: '/prestations', label: 'Prestation', icon: Printer, privilege: 'gerer_prestations' },
      { to: '/projets', label: 'Projets', icon: FolderOpen, privilege: 'gerer_projets' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/stock', label: 'Stock', icon: Boxes, privilege: 'gerer_stock' },
      { to: '/caisse', label: 'Caisse', icon: CreditCard, privilege: 'gerer_caisse' },
      { to: '/factures', label: 'Facture', icon: FileText, privilege: 'gerer_factures' },
    ],
  },
  {
    label: 'Analyse',
    items: [{ to: '/rapports', label: 'Rapport', icon: BarChart3, privilege: 'voir_rapports' }],
  },
]

const footerItems = [
  { to: '/parametres', label: 'Parametre', icon: Settings, privilege: 'administrer' },
  { to: '/aide', label: 'Aide', icon: CircleHelp },
]

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-1.5 text-[22px] font-medium leading-none transition-colors hover:bg-gaia-200/40 ${
          isActive ? 'bg-gaia-200/60' : ''
        }`
      }
    >
      <Icon size={22} strokeWidth={2.4} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const can = useCan()
  const visible = sections
    .map((section) => ({ ...section, items: section.items.filter((i) => can(i.privilege)) }))
    .filter((section) => section.items.length)
  const footer = footerItems.filter((i) => can(i.privilege))
  return (
    <aside className="flex w-[260px] shrink-0 flex-col overflow-y-auto rounded-[28px] bg-surface px-5 py-6">
      <h1 className="text-center font-display text-[30px] leading-none tracking-wide text-gaia-900">
        GAIA
      </h1>

      <nav className="mt-6 flex flex-1 flex-col gap-10">
        {visible.map((section) => (
          <div key={section.label}>
            <p className="mb-1 text-[22px] text-muted">{section.label}</p>
            <div className="flex flex-col gap-1 pl-6">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t-[3px] border-gaia-900 pt-4">
        <div className="flex flex-col gap-1 pl-6">
          {footer.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    </aside>
  )
}
