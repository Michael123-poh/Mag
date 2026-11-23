import { Ellipsis } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'

export default function MemberCard({ nom, projets, tone }) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white px-3 py-3">
      <Avatar tone={tone} size={44} className="ring-0" />
      <div className="min-w-0 flex-1">
        <p className="t pj-member-name truncate">{nom}</p>
        <p className="t pj-member-sub mt-1">{projets} Projets en cours</p>
      </div>
      <button type="button" aria-label={`Actions ${nom}`} className="self-start p-0.5">
        <Ellipsis size={16} />
      </button>
    </div>
  )
}
