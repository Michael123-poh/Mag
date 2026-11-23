// Carte de compte texturée (Caisse, Banque, Mobile). tone = classe de couleur de fond.
export default function AccountCard({ nom, montant, icon: Icon, tone }) {
  return (
    <article
      className={`cs-account cs-texture relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-white ${tone}`}
    >
      <div className="relative flex items-center justify-between">
        <p className="t cs-account-name">{nom}</p>
        <Icon size={24} strokeWidth={2} />
      </div>
      <p className="relative">
        <span className="t cs-account-amount">{montant}</span>{' '}
        <span className="t cs-account-unit">xaf</span>
      </p>
    </article>
  )
}
