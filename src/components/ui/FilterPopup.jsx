import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Pop-up de filtres partagé : une ligne par catégorie, des petites cartes sélectionnables et un résumé en phrase.
//   categories : [{ key, label, allowNone, options: [{ value, label }] }]
//   summary    : phrase de résumé des filtres choisis
//   error      : message affiché si l'enregistrement du filtre échoue
//   prefix     : préfixe des classes de la page (ex. "cl-pop", "pr-pop") → .{prefix}, -panel, -title, -cat, -chip, -summary, -btn…
export default function FilterPopup({
  categories,
  summary,
  value,
  onChange,
  onApply,
  onReset,
  onClose,
  prefix = 'pop',
  title = 'Filtres',
  error = '',
}) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (cat, v) => {
    const same = value[cat.key] === v
    onChange({ ...value, [cat.key]: same && cat.allowNone ? null : v })
  }

  return createPortal(
    <div
      className={`${prefix} fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${prefix}-title`}
        className={`${prefix}-panel w-full rounded-3xl bg-white px-8 py-6 shadow-2xl`}
      >
        <header className="flex items-start justify-between">
          <button
            ref={closeRef}
            type="button"
            aria-label="Fermer les filtres"
            onClick={onClose}
            className="rounded-full p-1 text-gaia-900"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
          <h2 id={`${prefix}-title`} className={`t ${prefix}-title`}>
            {title}
          </h2>
        </header>

        <div className={`${prefix}-rows mt-4 flex flex-col`}>
          {categories.map((cat) => (
            <div key={cat.key} className={`${prefix}-row flex flex-col`}>
              <p className={`t ${prefix}-cat`}>{cat.label}</p>
              <div className={`${prefix}-chips flex flex-wrap`}>
                {cat.options.map((o) => {
                  const on = value[cat.key] === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(cat, o.value)}
                      className={`rounded-xl px-3 py-1.5 transition-colors ${
                        on
                          ? 'bg-gaia-200 text-gaia-700'
                          : 'bg-surface text-gaia-900/70 hover:bg-gaia-200/40'
                      }`}
                    >
                      <span className={`t ${prefix}-chip`}>{o.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className={`t ${prefix}-summary mt-5 text-gaia-700/60`}>{summary}</p>

        {error && (
          <p role="alert" className={`t ${prefix}-summary mt-3 text-danger`}>
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-4">
          <button type="button" onClick={onReset} className={`t ${prefix}-btn text-gaia-700/70`}>
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onApply}
            className={`t ${prefix}-btn rounded-full bg-accent px-6 py-1 text-white`}
          >
            Appliquer
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
