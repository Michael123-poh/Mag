import { useEffect, useRef, useState } from 'react'
import Avatar from '../ui/Avatar.jsx'

const ROW = 90 // hauteur d'une heure
const BLOCK_H = 142 // hauteur d'une carte de tâche
const pad = (n) => String(n).padStart(2, '0')

const tones = {
  dark: 'bg-gaia-700',
  blue: 'bg-gaia-500',
  orange: 'bg-accent',
}

const localIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Cartes d'une même journée qui se chevauchent : elles se partagent la largeur (une « voie » chacune)
function layout(list) {
  const sorted = [...list].sort((a, b) => a.h - b.h || a.id - b.id)
  const result = []
  let cluster = []
  let laneEnds = []
  const flush = () => {
    cluster.forEach((c) => result.push({ ...c, lanes: laneEnds.length }))
    cluster = []
    laneEnds = []
  }
  for (const b of sorted) {
    if (cluster.length && laneEnds.every((e) => e <= b.h)) flush()
    let lane = laneEnds.findIndex((e) => e <= b.h)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = b.h + BLOCK_H / ROW
    cluster.push({ ...b, lane })
  }
  flush()
  return result
}

// planning : { jours: [{ label, iso, date }], blocs: [{ id, col, h, hFin, who, avatar, tone, titre }], aPlanifier: [{ id, titre, who, tone, avatar }] }
// onOpen(id) : clic sur une carte (affiche la date d'exécution)
// Chaque tâche est une carte texturée. Un trait traverse tout le planning à l'heure actuelle, avec un rond à son début
// (quand la semaine affichée est celle d'aujourd'hui) ; la grille s'élargit pour que l'heure actuelle et toutes les tâches y tiennent.
export default function TaskTimeline({ planning, onOpen }) {
  const { jours, blocs, aPlanifier } = planning
  const [now, setNow] = useState(() => new Date())
  const scroller = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const todayCol = jours.findIndex((j) => j.iso === localIso(now))
  const nowH = now.getHours() + now.getMinutes() / 60
  const showNow = todayCol >= 0

  // Heures affichées : 08:00-18:00 au moins, plus tout ce qu'il faut pour les tâches et l'heure actuelle
  let first = 8
  let last = 18
  for (const b of blocs) {
    first = Math.min(first, Math.floor(b.h))
    last = Math.max(last, Math.ceil(b.h + BLOCK_H / ROW))
  }
  if (showNow) {
    first = Math.min(first, Math.floor(nowH))
    last = Math.max(last, Math.floor(nowH) + 1)
  }
  const hours = Array.from({ length: last - first }, (_, i) => `${pad(first + i)}:00`)
  const topOf = (h) => Math.round((h - first) * ROW)
  const nowPx = topOf(nowH)
  const bodyH = ROW * hours.length + 60
  const gridCols = { gridTemplateColumns: `56px repeat(${jours.length}, minmax(0, 1fr))` }

  // À l'ouverture et à chaque changement de semaine : le planning défile jusqu'à l'heure actuelle si elle tombe en journée de travail
  // (08:00-18:00), sinon jusqu'à la première tâche
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const target = showNow && nowH >= 8 && nowH <= 18 ? nowPx - 140 : blocs.length ? Math.min(...blocs.map((b) => topOf(b.h))) - 20 : 0
    el.scrollTop = Math.max(0, target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planning.semaine])

  return (
    <div className="rounded-3xl bg-white">
      <div ref={scroller} className="pd-timeline max-h-[420px] overflow-y-auto px-4 pb-6">
        {/* En-tête des jours : collé en haut, pleine largeur et sans trou (rien ne passe au-dessus ni sur les côtés) */}
        <div className="pd-timeline-head sticky top-0 z-20 -mx-4 grid bg-white px-4 pt-5" style={gridCols}>
          <span />
          {jours.map(({ label: j, date: d }, i) => (
            <div key={d} className={`pb-4 text-center ${i === todayCol ? 'pd-day-today text-gaia-900' : 'text-gaia-700/70'}`}>
              <p className="t pd-day-name">{j}</p>
              <p className="t pd-day-date">{d}</p>
            </div>
          ))}
        </div>

        <div className="relative grid" style={{ ...gridCols, height: bodyH }}>
          <div className="relative">
            {hours.map((h, i) => (
              <span key={h} className="absolute left-1 text-gaia-700/70" style={{ top: 4 + i * ROW }}>
                <span className="t pd-hour">{h}</span>
              </span>
            ))}
          </div>

          {jours.map((jour, c) => (
            <div key={jour.iso} className={`relative ${c === todayCol ? 'pd-today-col' : ''}`}>
              {layout(blocs.filter((b) => b.col === c)).map((b) => (
                <article
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Voir la tâche : ${b.titre}`}
                  onClick={() => onOpen?.(b.id)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onOpen?.(b.id)
                    }
                  }}
                  className={`pd-block absolute h-[142px] cursor-pointer overflow-hidden rounded-xl p-2 text-white ${tones[b.tone]}`}
                  style={{
                    top: topOf(b.h),
                    left: `calc(${b.lane} * 100% / ${b.lanes} + 6px)`,
                    right: `calc(${b.lanes - b.lane - 1} * 100% / ${b.lanes} + 6px)`,
                  }}
                >
                  <p className="flex items-center gap-2">
                    <Avatar tone={b.avatar} size={34} className="ring-0" />
                    <span className="t pd-block-name">{b.who}</span>
                  </p>
                  <p className="t pd-block-text mt-3">{b.titre}</p>
                </article>
              ))}
            </div>
          ))}

          {/* Heure actuelle : un trait sur toute la largeur, avec un rond à son début */}
          {showNow && (
            <div className="pd-now pointer-events-none absolute inset-x-0 z-10 h-0" style={{ top: nowPx }} aria-label="Heure actuelle">
              <span className="pd-now-line absolute inset-x-0 top-0" />
              <span className="pd-now-dot absolute left-0 top-0" />
            </div>
          )}
        </div>
      </div>

      {aPlanifier.length > 0 && (
        <div className="pd-unplanned flex flex-wrap items-center">
          <span className="t pd-unplanned-label text-gaia-700/70">À planifier</span>
          {aPlanifier.map((t) => (
            <button key={t.id} type="button" onClick={() => onOpen?.(t.id)} className="pd-unplanned-chip">
              <span className="t pd-unplanned-text">{t.titre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
