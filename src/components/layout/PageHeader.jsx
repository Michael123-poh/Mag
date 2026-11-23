import '../../styles/header.css'
import { useAuth } from '../../auth/useAuth.js'
import { firstName } from '../../lib/format.js'

function DateBadge({ prefix }) {
  const now = new Date()
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const jour = cap(now.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''))
  const mois = cap(now.toLocaleDateString('fr-FR', { month: 'long' }))
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-[76px] items-center justify-center rounded-full bg-white text-gaia-700">
        <span className={`t ${prefix}-date-number`}>{String(now.getDate()).padStart(2, '0')}</span>
      </div>
      <div>
        <p className={`t ${prefix}-date-day`}>{jour},</p>
        <p className={`t ${prefix}-date-month`}>{mois}</p>
      </div>
    </div>
  )
}

// prefix : préfixe des classes de texte (ex. "hdr" → hdr-hello, hdr-name, hdr-subtitle, hdr-date-*)
export default function PageHeader({
  prefix = 'hdr',
  lead = 'Hello',
  name, // par défaut : prénom de l'employé connecté
  subtitle = 'Regardons comment vas ton business',
  action, // à la place de la date, en haut à droite (ex. un bouton)
}) {
  const { user } = useAuth()
  const shownName = name ?? (user ? `${firstName(user.nom)} !` : '')
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2 className="leading-none">
          <span className={`t ${prefix}-hello`}>{lead}</span>
          {shownName && (
            <>
              {' '}
              <span className={`t ${prefix}-name`}>{shownName}</span>
            </>
          )}
        </h2>
        <p className={`t ${prefix}-subtitle`}>{subtitle}</p>
      </div>
      {action ?? <DateBadge prefix={prefix} />}
    </header>
  )
}
