import '../../pages/factureDocument.css'
import { fmtDate, fmtDateLong, fmtMoney, fmtTime } from '../../lib/format.js'
import { nombreEnLettres } from '../../lib/nombreEnLettres.js'

const STATUT = {
  payee: { label: 'Payée', tone: 'fd-pill-ok' },
  partielle: { label: 'Partiellement payée', tone: 'fd-pill-part' },
  impayee: { label: 'Impayée', tone: 'fd-pill-due' },
}

const xaf = (n) => `${fmtMoney(n)} xaf`

// Titre numéroté d'une section du document
function Section({ numero, titre, children }) {
  return (
    <section className="fd-section">
      <h2 className="t fd-section-title">
        <span className="fd-section-num">{numero}</span> {titre}
      </h2>
      {children}
    </section>
  )
}

// Une information : petit titre au-dessus, valeur dessous (rien n'est affiché si la valeur est vide)
function Info({ label, children }) {
  if (!children) return null
  return (
    <div className="fd-info">
      <dt className="t fd-label">{label}</dt>
      <dd className="t fd-value">{children}</dd>
    </div>
  )
}

// Facture sur feuille A4 : un document organisé en sections numérotées (identité, client, détail, récapitulatif, paiements, modalités).
//   data : la réponse de GET /api/factures/:id (facture, client, groupes, paiements, entreprise)
export default function FactureA4({ data }) {
  const { facture: f, client: c, groupes, paiements, entreprise: e } = data
  const statut = STATUT[f.statut]
  const nbLignes = groupes.reduce((n, g) => n + Math.max(g.details.length, 1), 0)
  const adresseClient = [c.adresse, c.ville].filter(Boolean).join(', ')
  const identiteEntreprise = [e.niu && `NIU : ${e.niu}`, e.rccm && `RCCM : ${e.rccm}`].filter(Boolean).join('   ·   ')

  return (
  <article className="fd-sheet">
    {/* ---- En-tête : l'entreprise à gauche, la facture à droite ---- */}
    <header className="fd-head">
    <div>
        <p className="t fd-company">{e.nom}</p>
        {e.slogan && <p className="t fd-slogan">{e.slogan}</p>}
        <div className="fd-company-lines">
          {[e.adresse, e.telephone, e.email, e.site].filter(Boolean).map((l) => (
            <p key={l} className="t fd-small">
              {l}
            </p>
          ))}
          {identiteEntreprise && <p className="t fd-small">{identiteEntreprise}</p>}
        </div>
      </div>
      <div className="fd-head-right">
        <p className="t fd-doc-title">FACTURE</p>
        <p className="t fd-number">{f.numero}</p>
        <span className={`t fd-pill ${statut.tone}`}>{statut.label}</span>
      </div>
    </header>

    {/* ---- Références de la facture ---- */}
    <dl className="fd-meta">
      <Info label="Date d'émission">{fmtDateLong(f.emission)}</Info>
      <Info label="Période de paiement">{f.periodeDebut ? `${fmtDate(f.periodeDebut)} → ${fmtDate(f.echeance)}` : null}</Info>
      <Info label="Date limite de paiement">{fmtDateLong(f.echeance)}</Info>
      <Info label="Établie par">{f.emisePar}</Info>
    </dl>

    {/* ---- 1. Client ---- */}
    <Section numero="1" titre="Facturé à">
      <div className="fd-client">
        <p className="t fd-client-name">{c.nom}</p>
        <dl className="fd-client-info">
          <Info label="Code client">{c.code}</Info>
          <Info label="Forme juridique · activité">{[c.formeJuridique, c.activite].filter(Boolean).join(' · ') || null}</Info>
          <Info label="Adresse">{adresseClient || null}</Info>
          <Info label="Téléphone">{c.telephone}</Info>
          <Info label="Email">{c.email}</Info>
        </dl>
      </div>
    </Section>

    {/* ---- 2. Détail : chaque prestation ou projet, avec ses lignes ---- */}
    <Section numero="2" titre={`Détail de la facture (${groupes.length} ${groupes.length > 1 ? 'éléments' : 'élément'}, ${nbLignes} ${nbLignes > 1 ? 'lignes' : 'ligne'})`}>
      {groupes.map((g, i) => (
        <div key={`${g.ref}-${i}`} className="fd-group">
          <div className="fd-group-head">
            <div className="min-w-0">
              <p className="t fd-group-title">
                <span className="fd-group-num">2.{i + 1}</span> {g.titre}
              </p>
              <p className="t fd-small">
                {g.type === 'prestation' ? 'Prestation' : 'Projet'} {g.ref}
                {g.sousTitre ? ` · ${g.sousTitre}` : ''}
              </p>
            </div>
            <p className="t fd-group-total">{xaf(g.montant)}</p>
          </div>

          {g.details.length > 0 ? (
            <table className="fd-table">
              <thead>
                <tr>
                  <th className="t fd-th">Désignation</th>
                  {g.type === 'prestation' && <th className="t fd-th fd-num">Qté</th>}
                  {g.type === 'prestation' && <th className="t fd-th fd-num">Prix unitaire</th>}
                  <th className="t fd-th fd-num">Montant</th>
                </tr>
              </thead>
              <tbody>
                {g.details.map((d, j) => (
                  <tr key={j}>
                    <td className="t fd-td">
                      <span className="fd-line-num">2.{i + 1}.{j + 1}</span> {d.libelle}
                    </td>
                    {g.type === 'prestation' && <td className="t fd-td fd-num">{fmtMoney(d.quantite)}</td>}
                    {g.type === 'prestation' && <td className="t fd-td fd-num">{fmtMoney(d.prixUnitaire)}</td>}
                    <td className="t fd-td fd-num">{fmtMoney(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="t fd-small fd-nodetail">Détail ligne par ligne non enregistré : montant global de l'élément.</p>
          )}
        </div>
      ))}
    </Section>

    {/* ---- 3. Récapitulatif ---- */}
    <Section numero="3" titre="Récapitulatif">
      <table className="fd-totals">
        <tbody>
          <tr>
            <td className="t fd-total-label">Total de la facture</td>
            <td className="t fd-total-value">{xaf(f.total)}</td>
          </tr>
          <tr>
            <td className="t fd-total-label">Déjà encaissé</td>
            <td className="t fd-total-value">− {xaf(f.encaisse)}</td>
          </tr>
          <tr className={f.reste > 0 ? 'fd-total-due' : 'fd-total-done'}>
            <td className="t fd-total-label">Reste à payer</td>
            <td className="t fd-total-value">{xaf(f.reste)}</td>
          </tr>
        </tbody>
      </table>
      <p className="t fd-words">
        Arrêtée la présente facture à la somme de <strong>{nombreEnLettres(f.total)} francs CFA</strong> ({xaf(f.total)}).
      </p>
    </Section>

    {/* ---- 4. Paiements reçus ---- */}
    <Section numero="4" titre="Paiements reçus">
      {paiements.length === 0 ? (
        <p className="t fd-small">Aucun paiement reçu pour le moment.</p>
      ) : (
        <table className="fd-table">
          <thead>
            <tr>
              <th className="t fd-th">Date</th>
              <th className="t fd-th">Paiement</th>
              <th className="t fd-th">Compte</th>
              <th className="t fd-th fd-num">Montant</th>
              <th className="t fd-th fd-num">Reste après</th>
            </tr>
          </thead>
          <tbody>
            {paiements.map((p) => (
              <tr key={p.id}>
                <td className="t fd-td">
                  {fmtDate(p.date)} <span className="fd-time">{fmtTime(p.date)}</span>
                </td>
                <td className="t fd-td">
                  {p.libelle || 'Paiement'}
                  {p.par && <span className="fd-time"> · reçu par {p.par}</span>}
                </td>
                <td className="t fd-td">{p.compte}</td>
                <td className="t fd-td fd-num">{fmtMoney(p.montant)}</td>
                <td className="t fd-td fd-num">{fmtMoney(Math.max(0, p.resteApres))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>

    {/* ---- 5. Modalités de paiement ---- */}
    {(e.paiement_banque || e.paiement_mobile || e.conditions || f.reste > 0) && (
      <Section numero="5" titre="Modalités de paiement">
        <dl className="fd-pay">
          <Info label="Date limite">{f.reste > 0 ? fmtDateLong(f.echeance) : null}</Info>
          <Info label="Virement bancaire">{e.paiement_banque}</Info>
          <Info label="Mobile money">{e.paiement_mobile}</Info>
          <Info label="Conditions">{e.conditions}</Info>
        </dl>
      </Section>
    )}

    {/* ---- Signatures et pied de page ---- */}
    <div className="fd-sign">
      <div>
        <p className="t fd-label">Le client</p>
        <div className="fd-sign-box" />
      </div>
      <div>
        <p className="t fd-label">Pour {e.nom}</p>
        <div className="fd-sign-box" />
      </div>
    </div>

    <footer className="fd-foot">
      {e.mentions && <p className="t fd-small">{e.mentions}</p>}
      <p className="t fd-small">
        {e.nom} · Facture {f.numero} · {identiteEntreprise || fmtDate(f.emission)}
      </p>
    </footer>
  </article>
  )
}
