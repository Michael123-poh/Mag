import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../../api/client.js'

// Choix d'un client en tapant son nom : les noms les plus proches de ce qui est tapé s'affichent dessous.
//   value    : client choisi ({ id, nom, code }) ou null
//   onChange : reçoit le client choisi, ou null dès que l'on retape
//   path     : recherche utilisée (par défaut celle des prestations ; les projets ont la leur)
export default function ClientPicker({ value, onChange, invalid, path = '/prestations/clients' }) {
  const [text, setText] = useState(value?.nom ?? '')
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const timer = useRef(null)
  const request = useRef(0) // numéro de la dernière recherche : une réponse tardive d'une ancienne frappe est ignorée
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const search = (q) => {
    const mine = ++request.current
    api(`${path}?q=${encodeURIComponent(q)}`)
      .then((rows) => {
        if (mine !== request.current) return
        setList(rows)
        setActive(0)
        setOpen(true)
      })
      .catch(() => mine === request.current && setList([]))
  }

  const choose = (c) => {
    onChange(c)
    setText(c.nom)
    setOpen(false)
  }

  const onType = (q) => {
    setText(q)
    if (value) onChange(null)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(q), 180)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) return search(text)
      e.preventDefault()
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % Math.max(list.length, 1))
    } else if (e.key === 'Enter' && open && list[active]) {
      e.preventDefault()
      choose(list[active])
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
        aria-label="Client"
        autoComplete="off"
        placeholder="Tapez le nom du client"
        value={text}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => !value && search(text)}
        onKeyDown={onKeyDown}
        data-invalid={invalid}
        className="t nc-input nc-field w-full outline-none"
      />

      {open && (
        <ul id={listId} role="listbox" className="pn-pick-list absolute left-0 right-0 top-full z-30 mt-2 overflow-y-auto bg-white shadow-xl ring-1 ring-black/5">
          {list.length === 0 && <li className="t pn-pick-meta pn-pick-empty">Aucun client trouvé</li>}
          {list.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                onMouseEnter={() => setActive(i)}
                data-active={i === active}
                className="pn-pick-row flex w-full flex-col text-left"
              >
                <span className="t pn-pick-name">{c.nom}</span>
                <span className="t pn-pick-meta">
                  {c.code}
                  {c.ville ? ` · ${c.ville}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
