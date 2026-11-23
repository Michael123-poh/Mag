import { useEffect, useRef, useState } from 'react'
import { COUNTRIES } from './newClient.js'

// Numéro de téléphone : drapeau + indicatif (menu déroulant) puis le numéro.
export default function PhoneField({ country, number, onCountry, onNumber, invalid }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = COUNTRIES.find((c) => c.code === country)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="nc-phone flex items-center">
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-label="Choisir le pays"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="nc-country flex flex-col items-start"
        >
          <span className="flex items-center gap-2">
            <span className="nc-flag" style={{ background: current.flag }} />
            <span className="nc-caret" aria-hidden="true" />
          </span>
          <span className="t nc-country-code">{current.code}</span>
        </button>

        {open && (
          <ul role="listbox" className="nc-country-list absolute left-0 top-full z-30 mt-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
            {COUNTRIES.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === country}
                  onClick={() => {
                    onCountry(c.code)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left hover:bg-surface"
                >
                  <span className="nc-flag" style={{ background: c.flag }} />
                  <span className="t nc-option">{c.code}</span>
                  <span className="t nc-option text-gaia-700/60">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="nc-input nc-phone-input flex flex-1 items-center" data-invalid={invalid}>
        <span className="t nc-dial">{current.dial}</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={12}
          value={number}
          onChange={(e) => onNumber(e.target.value.replace(/\D/g, ''))}
          aria-label="Numéro de téléphone"
          className="t nc-field min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
    </div>
  )
}
