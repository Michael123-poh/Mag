import { Ellipsis } from 'lucide-react'
import { fmtDate, fmtMoney } from '../../lib/format.js'
import Avatar from '../ui/Avatar.jsx'

const th = 'pb-2 font-normal uppercase text-gaia-700/60'

// clients : [{ id, code, nom, type, telephone, maj, solde, tone }]
export default function ClientsTable({ clients }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-1 uppercase">
        <thead>
          <tr>
            <th className={`${th} text-left`}><span className="t cl-th">Clients</span></th>
            <th className={th}><span className="t cl-th">Type</span></th>
            <th className={th}><span className="t cl-th">Contact</span></th>
            <th className={th}><span className="t cl-th">Mise à jour</span></th>
            <th className={`${th} text-right`}><span className="t cl-th">Solde</span></th>
            <th className={th} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center normal-case text-gaia-700/60">
                <span className="t cl-contact">Aucun client ne correspond à ce filtre.</span>
              </td>
            </tr>
          )}
          {clients.map((c) => (
            <tr key={c.id} className="text-center">
              <td className="py-3 text-left">
                <div className="flex items-center gap-2">
                  <Avatar tone={c.tone} size={32} className="ring-0" />
                  <div>
                    <p className="t cl-name">{c.nom}</p>
                    <p className="t cl-code mt-0.5">{c.code}</p>
                  </div>
                </div>
              </td>
              <td><span className="t cl-type">{c.type}</span></td>
              <td><span className="t cl-contact">{c.telephone}</span></td>
              <td><span className="t cl-date">{fmtDate(c.maj)}</span></td>
              <td className="text-right">
                <span className="t cl-balance">{fmtMoney(c.solde)}</span>{' '}
                <span className="t cl-balance-unit">xaf</span>
              </td>
              <td className="w-10">
                <button type="button" aria-label={`Actions ${c.nom}`} className="p-1">
                  <Ellipsis size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
