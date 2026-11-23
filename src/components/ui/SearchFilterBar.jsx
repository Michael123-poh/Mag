import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

// Ligne de recherche + sélecteurs compacts.
//   prefix  : préfixe des classes de la page (ex. "stk", "fa") → .{prefix}-filters, -search, -search-text, -select-label, -select
//   selects : [{ key, label, options: [{ value, label }] }]  (la 1re option, valeur '', = « tous »)
//   onChange : appelé avec { q, [clé du sélecteur]: valeur } à chaque modification (recherche retardée de 300 ms)
export default function SearchFilterBar({ prefix, placeholder, selects, onChange, ariaLabel = 'Recherche et filtres' }) {
  const [query, setQuery] = useState('')
  const [value, setValue] = useState(() => Object.fromEntries(selects.map((s) => [s.key, ''])))

  const callback = useRef(onChange)
  useEffect(() => {
    callback.current = onChange
  })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return undefined
    }
    const timer = setTimeout(() => callback.current?.({ q: query.trim(), ...value }), 300)
    return () => clearTimeout(timer)
  }, [query, value])

  return (
    <section aria-label={ariaLabel} className={`${prefix}-filters flex flex-wrap items-center`}>
      <label className={`${prefix}-search flex items-center gap-3 rounded-full bg-white px-4 py-2`}>
        <Search size={22} strokeWidth={2.2} className="shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`t ${prefix}-search-text w-full bg-transparent outline-none placeholder:text-muted`}
        />
      </label>

      {selects.map((s) => (
        <label key={s.key} className="relative inline-flex items-center rounded-full bg-white">
          <span className={`t ${prefix}-select-label pl-4 text-gaia-700/60`}>{s.label}</span>
          <select
            aria-label={s.label}
            value={value[s.key]}
            onChange={(e) => setValue({ ...value, [s.key]: e.target.value })}
            className={`t ${prefix}-select cursor-pointer appearance-none bg-transparent py-2 pl-2 pr-9 outline-none ${
              value[s.key] ? 'text-gaia-500' : 'text-gaia-900'
            }`}
          >
            {s.options.map((o) => (
              <option key={o.value} value={o.value} className="text-gaia-900">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            strokeWidth={2.6}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gaia-900"
          />
        </label>
      ))}
    </section>
  )
}
