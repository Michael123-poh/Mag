import { useState } from 'react'

const MOIS = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// Charge d'une journée = nombre de tâches planifiées ce jour-là, tous projets confondus (un jour peut avoir 20 tâches venant de 3 projets).
// La couleur suit cette charge, comme les contributions GitHub : 4 niveaux, du plus clair au plus foncé.
// FULL_DAY = nombre de tâches à partir duquel une journée est « pleine » (couleur la plus foncée) ; si un jour du mois en a davantage, c'est lui qui sert de repère.
const FULL_DAY = 8
const level = (n, top) => {
  const ratio = n / top
  return ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4
}
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

// mois : "2026-10" · calendrier : [{ date: "2026-10-26", n, projets }] (n = tâches ce jour-là, projets = projets concernés)
export default function MonthCalendar({ mois, calendrier }) {
  const [selected, setSelected] = useState(null) // jour « déployé »
  const YEAR = Number(mois.slice(0, 4))
  const MONTH = Number(mois.slice(5, 7)) - 1
  const MONTH_LABEL = MOIS[MONTH]
  const byDay = Object.fromEntries(calendrier.map((c) => [Number(c.date.slice(8, 10)), c]))
  const top = Math.max(FULL_DAY, ...calendrier.map((c) => c.n))
  const offset = (new Date(YEAR, MONTH, 1).getDay() + 6) % 7 // semaine commençant le lundi
  const days = new Date(YEAR, MONTH + 1, 0).getDate()

  return (
    <div className="pj-cal">
      <h2 className="leading-none">
        <span className="t pj-cal-month mr-2">{MONTH_LABEL}</span>{' '}
        <span className="t pj-cal-year">{YEAR}</span>
      </h2>

      <div className="pj-cal-grid mt-3">
        {WEEKDAYS.map((w) => (
          <span key={w} className="t pj-cal-weekday text-center text-muted">
            {w}
          </span>
        ))}

        {Array.from({ length: offset }, (_, i) => (
          <span key={`o${i}`} />
        ))}

        {Array.from({ length: days }, (_, i) => {
          const d = i + 1
          const n = byDay[d]?.n
          const projets = byDay[d]?.projets
          if (!n) {
            return (
              <div key={d} className="pj-cal-cell flex items-center justify-center rounded-lg">
                <span className="t pj-cal-day">{d}</span>
              </div>
            )
          }
          const open = selected === d
          return (
            <div key={d} className="pj-cal-cell relative">
              <button
                type="button"
                aria-expanded={open}
                aria-label={`${d} ${MONTH_LABEL} : ${plural(n, 'tâche')} sur ${plural(projets, 'projet')}`}
                title={`${plural(n, 'tâche')} · ${plural(projets, 'projet')}`}
                data-level={level(n, top)}
                onClick={() => setSelected(open ? null : d)}
                className={`pj-cal-btn absolute left-0 top-0 flex w-full cursor-pointer flex-col items-center rounded-lg transition-[height,box-shadow] duration-200 ${
                  open ? 'pj-cal-btn-open z-10 shadow-md' : 'justify-center'
                }`}
              >
                <span className={`t pj-cal-day ${open ? 'mt-1' : ''}`}>{d}</span>
                {open && (
                  <span className="t pj-cal-count mt-0.5 text-center">
                    {n}
                    <br />
                    {n > 1 ? 'tâches' : 'tâche'}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
