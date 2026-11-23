import { useEffect, useId, useRef, useState } from 'react'

// Choix d'un produit du stock en tapant son nom ou son code (la liste est déjà chargée : le filtre est immédiat).
//   produits : [{ id, code, nom, unite }] · value : produit choisi ou null · onChange : reçoit le produit, ou null dès que l'on retape
export default function ProductPicker({ produits, value, onChange, invalid }) {
  const [text, setText] = useState(value?.nom ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const q = text.trim().toLowerCase()
  const list = (value || !q ? produits : produits.filter((p) => `${p.nom} ${p.code}`.toLowerCase().includes(q))).slice(0, 8)
  const current = Math.min(active, Math.max(list.length - 1, 0))

  const choose = (p) => {
    onChange(p)
    setText(p.nom)
    setOpen(false)
  }

  const onType = (value2) => {
    setText(value2)
    if (value) onChange(null)
    setActive(0)
    setOpen(true)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) return setOpen(true)
      e.preventDefault()
      setActive((current + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % Math.max(list.length, 1))
    } else if (e.key === 'Enter' && open && list[current]) {
      e.preventDefault()
      choose(list[current])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Produit"
        autoComplete="off"
        placeholder="Tapez le nom du produit"
        value={text}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        data-invalid={invalid}
        className="t nc-input nc-field w-full outline-none"
      />

      {open && (
        <ul id={listId} role="listbox" className="pn-pick-list absolute left-0 right-0 top-full z-30 mt-2 overflow-y-auto bg-white shadow-xl ring-1 ring-black/5">
          {list.length === 0 && <li className="t pn-pick-meta pn-pick-empty">Aucun produit trouvé</li>}
          {list.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === current}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
                data-active={i === current}
                className="pn-pick-row flex w-full flex-col text-left"
              >
                <span className="t pn-pick-name">{p.nom}</span>
                <span className="t pn-pick-meta">
                  {p.code} · {p.unite}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
