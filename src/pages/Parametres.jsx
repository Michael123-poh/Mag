import './parametres.css'
import { useState } from 'react'
import PageShell from '../components/layout/PageShell.jsx'
import EmployesPanel from '../components/parametres/EmployesPanel.jsx'
import EpargnePanel from '../components/parametres/EpargnePanel.jsx'
import MachinesPanel from '../components/parametres/MachinesPanel.jsx'

const ONGLETS = [
  ['employes', 'Employés'],
  ['epargne', 'Épargne'],
  ['machines', 'Machines'],
]

// Paramètre (administrateurs) : employés et privilèges, taux d'épargne, machines et lecture des machines.
export default function Parametres() {
  const [onglet, setOnglet] = useState('employes')

  return (
    <PageShell>
      <header>
        <h2 className="t ps-title">Paramètre</h2>
        <p className="t ps-subtitle">Réglages de l'application</p>
      </header>

      <div role="tablist" aria-label="Rubriques" className="ps-tabs flex flex-wrap">
        {ONGLETS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={onglet === key} onClick={() => setOnglet(key)} className="ps-tab">
            <span className="t ps-tab-text">{label}</span>
          </button>
        ))}
      </div>

      <div className="ps-body">
        {onglet === 'employes' && <EmployesPanel />}
        {onglet === 'epargne' && <EpargnePanel />}
        {onglet === 'machines' && <MachinesPanel />}
      </div>
    </PageShell>
  )
}
