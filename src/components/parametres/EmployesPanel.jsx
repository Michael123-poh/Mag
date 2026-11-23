import { useState } from 'react'
import { useApi } from '../../hooks/useApi.js'
import { fmtDate, fmtMoney } from '../../lib/format.js'
import EmployeForm from './EmployeForm.jsx'

// Employés : la liste (poste, ce qu'ils font, salaire, privilèges) ; un clic ouvre la fiche à modifier ; « + Nouvel employé » en crée un.
export default function EmployesPanel() {
  const { data, error, reload } = useApi('/parametres/employes', { keepPrevious: true })
  const [form, setForm] = useState(null) // null = fermé · 'nouveau' · l'employé à modifier
  if (!data) return error ? <p className="t ps-note text-danger">{error.message}</p> : <p className="t ps-note">Chargement…</p>

  const libelles = Object.fromEntries(data.privileges.map((p) => [p.code, p.libelle]))

  return (
    <section aria-label="Employés">
      <div className="ps-bar flex flex-wrap items-center justify-between">
        <p className="t ps-note">{data.employes.length} employé{data.employes.length > 1 ? 's' : ''}</p>
        <button type="button" onClick={() => setForm('nouveau')} className="t ps-btn rounded-full bg-gaia-700 text-white">
          + Nouvel employé
        </button>
      </div>

      <ul className="ps-list">
        {data.employes.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setForm(e)} className="ps-row ps-employe w-full text-left" data-off={!e.actif}>
              <div className="min-w-0">
                <p className="t ps-name">
                  {e.nom} <span className="ps-mat">{e.matricule}</span>
                  {!e.actif && <span className="ps-off">Désactivé</span>}
                </p>
                <p className="t ps-sub">
                  {e.poste}
                  {e.fonction ? ` · ${e.fonction}` : ''}
                </p>
                <p className="t ps-sub">
                  {e.email}
                  {e.telephone ? ` · ${e.telephone}` : ''}
                  {e.dateEmbauche ? ` · embauché le ${fmtDate(e.dateEmbauche)}` : ''}
                </p>
                <p className="ps-chips-line">
                  {e.privileges.length === 0 && <span className="t ps-tag ps-tag-none">Aucun privilège</span>}
                  {e.privileges.map((c) => (
                    <span key={c} className={`t ps-tag ${c === 'administrer' ? 'ps-tag-admin' : ''}`}>
                      {libelles[c] ?? c}
                    </span>
                  ))}
                </p>
              </div>
              <p className="ps-salary">
                <span className="t ps-amount">{e.salaire == null ? '—' : fmtMoney(e.salaire)}</span> {e.salaire != null && <span className="t ps-unit">xaf / mois</span>}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {form && (
        <EmployeForm
          employe={form === 'nouveau' ? null : form}
          postes={data.postes}
          privileges={data.privileges}
          moi={data.moi}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}
    </section>
  )
}

