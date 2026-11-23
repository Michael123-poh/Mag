import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Ellipsis, FileText, Pencil, Receipt, Send, Trash2 } from 'lucide-react'
import { api } from '../../api/client.js'
import { fmtDate } from '../../lib/format.js'
import Avatar from '../ui/Avatar.jsx'
import { telechargerFacture } from '../../lib/telechargerFacture.jsx'

const statuts = {
  payee: { label: 'Payée', classes: 'bg-gaia-200 text-gaia-900' },
  partielle: { label: 'Partielle', classes: 'bg-gaia-500 text-white' },
  impayee: { label: 'Impayée', classes: 'bg-danger text-white' },
}

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <p className="t fa-label uppercase text-gaia-700/50">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Amount({ value, className = '' }) {
  return (
    <p>
      <span className={`t fa-value ${className}`}>{fmt(value)}</span>{' '}
      <span className="t fa-value-unit">xaf</span>
    </p>
  )
}

// download : 'a4' ou 'ticket' = télécharge la facture en PDF dans ce format
const menu = [
  { icon: Pencil, label: 'Modifier' },
  { icon: Send, label: 'Envoyer au client' },
  { icon: Download, label: 'Télécharger le PDF (A4)', download: 'a4' },
  { icon: Receipt, label: 'Télécharger le ticket 80 mm', download: 'ticket' },
  { icon: Trash2, label: 'Supprimer', danger: true },
]

// Dernier format utilisé sur la page de la facture (feuille A4 ou ticket), retenu sur cet ordinateur
const preferredFormat = () => {
  try {
    return localStorage.getItem('gaia.facture.format') === 'ticket' ? 'ticket' : 'a4'
  } catch {
    return 'a4'
  }
}

// Carte d'une facture : informations principales en haut, détail des encaissements en bas.
export default function InvoiceCard({ f }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false) // PDF en cours de création
  const [dlError, setDlError] = useState('')

  // Télécharge la facture en PDF sans quitter la liste
  const download = async (format) => {
    if (busy) return
    setBusy(true)
    setDlError('')
    try {
      await telechargerFacture(await api(`/factures/${f.id}`), format)
    } catch (err) {
      setDlError(err.message || 'Le PDF n’a pas pu être créé')
    } finally {
      setBusy(false)
    }
  }
  const ref = useRef(null)
  const s = statuts[f.statut]
  const reste = f.total - f.encaisse

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
    <article className="fa-card rounded-2xl bg-white">
      {/* Ligne principale */}
      <div className="fa-top flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar tone={f.tone} size={38} className="ring-0" />
          <div>
            <h3 className="t fa-client">{f.client}</h3>
            <p className="t fa-number text-gaia-700/60">{f.numero}</p>
          </div>
        </div>

        <div className="fa-cols flex flex-wrap">
          <Field label="Émise le">
            <p className="t fa-value">{fmtDate(f.emission)}</p>
          </Field>
          <Field label="Échéance">
            <p className="t fa-value">{fmtDate(f.echeance)}</p>
          </Field>
          <Field label="Total">
            <Amount value={f.total} />
          </Field>
        </div>
      </div>

      {/* Détail des encaissements */}
      <div className="fa-bottom flex flex-wrap items-end justify-between">
        <div className="fa-cols flex flex-wrap items-end">
          <Field label="Encaissé">
            <Amount value={f.encaisse} />
          </Field>
          <Field label="Reste à payer">
            <Amount value={reste} className={reste > 0 ? 'text-accent' : ''} />
          </Field>
          <Field label="Versements">
            <p className="t fa-value">{f.versements ? `${f.versements} versement${f.versements > 1 ? 's' : ''}` : '—'}</p>
          </Field>
          <Field label="Compte">
            <p className="t fa-value">{f.compte}</p>
          </Field>
          <Field label="Statut" className="fa-status-field">
            <span className={`t fa-status inline-block rounded-full px-3 py-0.5 ${s.classes}`}>{s.label}</span>
          </Field>
        </div>

        <div ref={ref} className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/factures/${f.id}`)}
            className="fa-view flex items-center gap-1.5 rounded-lg px-3 py-1 text-gaia-900 hover:bg-surface"
          >
            <FileText size={16} strokeWidth={2.2} />
            <span className="t fa-view-text">Voir</span>
          </button>
          <button
            type="button"
            aria-label={`Télécharger ${f.numero}`}
            title={busy ? 'Création du PDF…' : 'Télécharger le PDF'}
            disabled={busy}
            onClick={() => download(preferredFormat())}
            className="rounded-lg p-1.5 text-gaia-900 hover:bg-surface"
          >
            <Download size={17} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label={`Autres actions ${f.numero}`}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-1.5 text-gaia-900 hover:bg-surface"
          >
            <Ellipsis size={18} />
          </button>

          {open && (
            <div
              role="menu"
              className="fa-menu absolute right-0 top-full z-20 mt-2 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5"
            >
              <p className="t fa-menu-title px-2 uppercase text-gaia-700/50">Autres actions</p>
              <ul className="mt-1">
                {menu.map((m) => (
                  <li key={m.label}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false)
                        if (m.download) download(m.download)
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface ${
                        m.danger ? 'text-danger' : 'text-gaia-900'
                      }`}
                    >
                      <m.icon size={16} strokeWidth={2.2} />
                      <span className="t fa-menu-item">{m.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {dlError && (
        <p role="alert" className="t fa-number mt-2 text-danger">
          {dlError}
        </p>
      )}
    </article>
  )
}
