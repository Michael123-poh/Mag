import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDay } from '../../lib/format.js'

// Navigation du planning : ‹ 26 Oct – 30 Oct › (les flèches sautent d'une semaine qui a des tâches à la suivante) + retour à aujourd'hui
//   planning : { semaine, courante, precedente, suivante, jours }  ·  onChange(lundi) : semaine choisie
export default function WeekNav({ planning, onChange }) {
  const { jours, semaine, courante, precedente, suivante } = planning
  return (
    <nav aria-label="Semaine du planning" className="pd-week flex items-center">
      {semaine !== courante && (
        <button type="button" onClick={() => onChange(courante)} className="pd-week-today">
          <span className="t pd-week-text">Aujourd'hui</span>
        </button>
      )}
      <button type="button" aria-label="Semaine précédente" disabled={!precedente} onClick={() => onChange(precedente)} className="pd-week-btn">
        <ChevronLeft size={18} strokeWidth={2.4} />
      </button>
      <span className="t pd-week-label">
        {fmtDay(jours[0].iso)} – {fmtDay(jours[jours.length - 1].iso)}
      </span>
      <button type="button" aria-label="Semaine suivante" disabled={!suivante} onClick={() => onChange(suivante)} className="pd-week-btn">
        <ChevronRight size={18} strokeWidth={2.4} />
      </button>
    </nav>
  )
}
