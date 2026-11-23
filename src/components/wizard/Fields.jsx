import { ChevronDown } from 'lucide-react'

// Briques communes des formulaires en plusieurs parties (styles : clientNouveau.css et prestationNouveau.css).

export function Field({ label, error, children, className = '' }) {
  return (
    <div className={`nc-group flex flex-col ${className}`}>
      <span className="t nc-label">{label}</span>
      {children}
      {error && <span className="t nc-error">{error}</span>}
    </div>
  )
}

export function TextInput({ value, onChange, type = 'text', invalid, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-invalid={invalid}
      className="t nc-input nc-field w-full outline-none"
      {...props}
    />
  )
}

// Nombre entier : on ne garde que les chiffres (value = chaîne de chiffres), affichage avec espaces (12 500 000)
export function NumberInput({ value, onChange, invalid, suffix, maxLength = 9, ...props }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={value ? Number(value).toLocaleString('fr-FR') : ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
        data-invalid={invalid}
        className="t nc-input nc-field w-full outline-none"
        {...props}
      />
      {suffix && (
        <span className="nc-unit pointer-events-none absolute top-1/2 -translate-y-1/2">
          <span className="t nc-unit-text">{suffix}</span>
        </span>
      )}
    </div>
  )
}

export function SelectInput({ value, onChange, options, invalid, label }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        data-invalid={invalid}
        className="t nc-input nc-field w-full appearance-none outline-none"
      >
        <option value="" />
        {/* options : textes simples, ou { value, label } quand la valeur envoyée diffère du texte affiché */}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value
          return (
            <option key={value} value={value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          )
        })}
      </select>
      <ChevronDown className="nc-chevron pointer-events-none absolute top-1/2 -translate-y-1/2" size={22} strokeWidth={2} />
    </div>
  )
}

export function TextArea({ value, onChange, invalid, ...props }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-invalid={invalid}
      className="t nc-input nc-field nc-textarea w-full resize-none outline-none"
      {...props}
    />
  )
}

// Choix d'une valeur parmi quelques-unes (petites pilules). options : [{ value, label }]
export function ChipGroup({ value, onChange, options, invalid, label }) {
  return (
    <div role="radiogroup" aria-label={label} data-invalid={invalid} className="nc-chips flex flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="nc-chip"
        >
          <span className="t nc-chip-text">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// Choix de plusieurs valeurs (cases à cocher en pilules). value : liste des valeurs choisies · options : [{ value, label }]
export function MultiChipGroup({ value, onChange, options, invalid, label }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div role="group" aria-label={label} data-invalid={invalid} className="nc-chips flex flex-wrap">
      {options.map((o) => (
        <button key={o.value} type="button" role="checkbox" aria-checked={value.includes(o.value)} onClick={() => toggle(o.value)} className="nc-chip">
          <span className="t nc-chip-text">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
