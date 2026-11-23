import './factureDocument.css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import PageStatus from '../components/ui/PageStatus.jsx'
import FactureA4 from '../components/factures/FactureA4.jsx'
import FactureTicket from '../components/factures/FactureTicket.jsx'
import { telechargerFacture } from '../lib/telechargerFacture.jsx'

// Modèle de facture : un document A4 organisé en sections numérotées (identité, client, détail, récapitulatif, paiements, modalités).
// Il s'imprime tel quel (bouton « Imprimer » → imprimer ou enregistrer en PDF).
export default function FactureDocument() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, reload } = useApi(`/factures/${encodeURIComponent(id)}`)
  // Format du document : feuille A4 ou ticket 80 mm (imprimante thermique) ; le dernier choix est retenu sur cet ordinateur
  const [format, setFormat] = useState(() => {
    try {
      return localStorage.getItem('gaia.facture.format') === 'ticket' ? 'ticket' : 'a4'
    } catch {
      return 'a4'
    }
  })
  const chooseFormat = (value) => {
    setFormat(value)
    try {
      localStorage.setItem('gaia.facture.format', value)
    } catch {
      /* stockage indisponible : le choix vaut pour cette page seulement */
    }
  }
  const [busy, setBusy] = useState(false) // téléchargement du PDF en cours
  const [dlError, setDlError] = useState('')
  const download = async () => {
    setBusy(true)
    setDlError('')
    try {
      await telechargerFacture(data, format)
    } catch (err) {
      setDlError(err.message || 'Le PDF n’a pas pu être créé')
    } finally {
      setBusy(false)
    }
  }
  if (!data || error) return <PageStatus loading={!error} error={error} onRetry={reload} />

  return (
    <div className="fd-page">
      {/* Taille de la page à l'impression : A4 (le ticket 80 mm règle la sienne, selon sa hauteur) */}
      {format === 'a4' && <style>{'@page { size: A4; margin: 0 }'}</style>}

      <div className="fd-toolbar">
        <button type="button" onClick={() => navigate('/factures')} className="t fd-tool">
          <ArrowLeft size={18} strokeWidth={2.4} /> Retour aux factures
        </button>
        <div role="radiogroup" aria-label="Format du document" className="fd-formats">
          {[
            ['a4', 'Feuille A4'],
            ['ticket', 'Ticket 80 mm'],
          ].map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={format === value} onClick={() => chooseFormat(value)} className="fd-format">
              <span className="t fd-tool">{label}</span>
            </button>
          ))}
        </div>
        <div className="fd-actions">
          <button type="button" onClick={download} disabled={busy} className="t fd-tool fd-tool-soft rounded-full bg-white text-gaia-700">
            <Download size={18} strokeWidth={2.4} /> {busy ? 'Création du PDF…' : 'Télécharger le PDF'}
          </button>
          <button type="button" onClick={() => window.print()} className="t fd-tool fd-tool-main rounded-full bg-gaia-700 text-white">
            <Printer size={18} strokeWidth={2.4} /> {format === 'ticket' ? 'Imprimer le ticket' : 'Imprimer'}
          </button>
        </div>
      </div>
      {dlError && (
        <p role="alert" className="t fd-dl-error">
          {dlError}
        </p>
      )}

      {format === 'ticket' ? <FactureTicket data={data} /> : <FactureA4 data={data} />}
    </div>
  )
}
