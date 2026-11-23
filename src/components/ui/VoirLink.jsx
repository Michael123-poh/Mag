import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

// textClass : classe de texte de la page (ex. "d-flow-voir"), définie dans le CSS de la page.
export default function VoirLink({ to = '#', className = '', textClass = 'voir' }) {
  return (
    <Link
      to={to}
      className={`t ${textClass} inline-flex items-center gap-0.5 ${className}`}
    >
      Voir
      <ArrowUpRight size={15} strokeWidth={2.5} />
    </Link>
  )
}
