const statuts = {
  livre: { label: 'Livré', classes: 'bg-gaia-200 text-gaia-900' },
  encours: { label: 'Encours', classes: 'bg-accent text-white' },
  afaire: { label: 'À faire', classes: 'bg-danger text-white' },
}

export default function PrestationRow({
  code,
  titre,
  client,
  prix,
  statut,
  paiement,
  echeance,
  onOpen,
}) {
  const s = statuts[statut]
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir la fiche : ${titre}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      className="pr-row grid cursor-pointer grid-cols-[1fr_auto_1fr] gap-4"
    >
      <div className="flex min-w-0 flex-col justify-between gap-3">
        <div>
          <p className="t pr-code text-gaia-700/70">{code}</p>
          <h3 className="t pr-titre mt-1">{titre}</h3>
          <p className="t pr-client">{client}</p>
        </div>
        <p>
          <span className="t pr-prix">{prix}</span> <span className="t pr-prix-unit">xaf</span>
        </p>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 pt-10">
        <p className="t pr-label text-gaia-700/70">Production</p>
        <span
          className={`t pr-pill min-w-[100px] rounded-full px-4 py-0.5 text-center ${s.classes}`}
        >
          {s.label}
        </span>
      </div>

      <div className="flex flex-col items-end justify-between gap-3">
        <div className="text-right">
          <p className="t pr-label text-gaia-700/70">Paiement</p>
          <p className="t pr-pay mt-1">{paiement}</p>
        </div>
        <p>
          <span className="t pr-ech-label mr-1 text-gaia-700/70">ÉCH.</span>
          <span className="t pr-ech">{echeance}</span>
        </p>
      </div>
    </article>
  )
}
