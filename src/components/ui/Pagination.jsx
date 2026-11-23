import { ChevronLeft, ChevronRight } from 'lucide-react'

// 1 … 4 5 6 … 12 : numéros affichés autour de la page en cours (null = « … »)
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const list = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(pages - 1, page + 1)
  if (from > 2) list.push(null)
  for (let n = from; n <= to; n++) list.push(n)
  if (to < pages - 1) list.push(null)
  list.push(pages)
  return list
}

// Petite pagination : « 11–20 sur 47 clients » à gauche, flèches et numéros à droite.
//   prefix : préfixe des classes de la page (ex. "cl-pager") → .{prefix}-info, .{prefix}-num (textes) ; tailles : voir le CSS de la page
//   noun   : ce que l'on compte (« clients »)
export default function Pagination({ page, pages, total, size, noun = '', onChange, prefix = 'pager' }) {
  if (pages <= 1) return null
  const first = (page - 1) * size + 1
  const last = Math.min(page * size, total)

  return (
    <nav aria-label="Pagination" className={`${prefix} flex flex-wrap items-center justify-between`}>
      <p className={`t ${prefix}-info text-gaia-700/70`}>
        {first}–{last} sur {total} {noun}
      </p>

      <ul className="pg-list flex items-center">
        <li>
          <button type="button" aria-label="Page précédente" disabled={page <= 1} onClick={() => onChange(page - 1)} className="pg-btn">
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
        </li>
        {pageList(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap${i}`} aria-hidden="true" className="pg-gap">
              <span className={`t ${prefix}-num`}>…</span>
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => n !== page && onChange(n)}
                className="pg-btn"
              >
                <span className={`t ${prefix}-num`}>{n}</span>
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" aria-label="Page suivante" disabled={page >= pages} onClick={() => onChange(page + 1)} className="pg-btn">
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </li>
      </ul>
    </nav>
  )
}
