import '../../pages/factureTicket.css'
import { useState } from 'react'
import { fmtDate, fmtMoney, fmtTime } from '../../lib/format.js'
import { nombreEnLettres } from '../../lib/nombreEnLettres.js'

const STATUT = { payee: 'PAYÉE', partielle: 'PARTIELLEMENT PAYÉE', impayee: 'IMPAYÉE' }
const xaf = (n) => `${fmtMoney(n)} xaf`

// Deux colonnes : un libellé à gauche, un montant à droite
function Row({ left, right, strong, big }) {
  return (
    <div className={`tk-row ${strong ? 'tk-strong' : ''}`}>
      <span className={`t ${big ? 'tk-big' : 'tk-text'}`}>{left}</span>
      <span className={`t ${big ? 'tk-big' : 'tk-text'} tk-amount`}>{right}</span>
    </div>
  )
}

const Rule = () => <hr className="tk-rule" />

// Facture pour imprimante thermique 80 mm : une seule colonne étroite, noir sur blanc, sans cadres ni couleurs.
//   data : la réponse de GET /api/factures/:id (facture, client, groupes, paiements, entreprise)
export default function FactureTicket({ data }) {
  const { facture: f, client: c, groupes, paiements, entreprise: e } = data
  // Le rouleau n'a pas de longueur fixe : la page d'impression fait 80 mm de large et exactement la hauteur du ticket
  // (Chrome ne comprend pas « 80mm auto »). On mesure le ticket (en pixels de mise en page, sans l'agrandissement d'écran) et on le convertit en mm.
  const [heightMm, setHeightMm] = useState(200)
  const measure = (el) => {
    if (!el) return undefined
    const update = () => setHeightMm(Math.ceil((el.offsetHeight * 25.4) / 96) + 2)
    const observer = new ResizeObserver(update)
    observer.observe(el)
    update()
    return () => observer.disconnect()
  }
  const coordonnees = [e.adresse, e.telephone, e.email, e.site].filter(Boolean)
  const identite = [e.niu && `NIU : ${e.niu}`, e.rccm && `RCCM : ${e.rccm}`].filter(Boolean)

  return (
    <article ref={measure} className="tk-ticket">
      <style>{`@page { size: 80mm ${heightMm}mm; margin: 0 }`}</style>
      {/* En-tête : l'entreprise */}
      <header className="tk-center">
        <p className="t tk-company">{e.nom}</p>
        {e.slogan && <p className="t tk-small">{e.slogan}</p>}
        {coordonnees.map((l) => (
          <p key={l} className="t tk-small">
            {l}
          </p>
        ))}
        {identite.map((l) => (
          <p key={l} className="t tk-small">
            {l}
          </p>
        ))}
      </header>

      <Rule />

      {/* La facture et son client */}
      <section className="tk-center">
        <p className="t tk-title">FACTURE</p>
        <p className="t tk-number">{f.numero}</p>
        <p className="t tk-status">{STATUT[f.statut]}</p>
      </section>
      <Row left="Date" right={fmtDate(f.emission)} />
      {f.reste > 0 && <Row left="Échéance" right={fmtDate(f.echeance)} />}
      {f.emisePar && <Row left="Établie par" right={f.emisePar} />}

      <Rule />

      <section>
        <p className="t tk-label">Client</p>
        <p className="t tk-name">{c.nom}</p>
        <p className="t tk-small">{c.code}</p>
        {c.telephone && <p className="t tk-small">{c.telephone}</p>}
        {[c.adresse, c.ville].filter(Boolean).length > 0 && <p className="t tk-small">{[c.adresse, c.ville].filter(Boolean).join(', ')}</p>}
      </section>

      <Rule />

      {/* Détail : chaque prestation ou projet, puis ses lignes (quantité × prix = montant) */}
      <section>
        <p className="t tk-label">Détail</p>
        {groupes.map((g, i) => (
          <div key={`${g.ref}-${i}`} className="tk-group">
            <Row left={g.titre} right={xaf(g.montant)} strong />
            <p className="t tk-small">
              {g.type === 'prestation' ? 'Prestation' : 'Projet'} {g.ref}
            </p>
            {g.details.map((d, j) => (
              <div key={j} className="tk-line">
                <p className="t tk-text">{d.libelle}</p>
                {g.type === 'prestation' ? (
                  <Row left={`${fmtMoney(d.quantite)} × ${fmtMoney(d.prixUnitaire)}`} right={fmtMoney(d.total)} />
                ) : (
                  <Row left="" right={fmtMoney(d.total)} />
                )}
              </div>
            ))}
          </div>
        ))}
      </section>

      <Rule />

      {/* Totaux */}
      <section>
        <Row left="TOTAL" right={xaf(f.total)} big strong />
        <Row left="Encaissé" right={xaf(f.encaisse)} />
        <Row left="RESTE À PAYER" right={xaf(f.reste)} strong />
        <p className="t tk-small tk-words">
          Arrêtée la présente facture à la somme de {nombreEnLettres(f.total)} francs CFA.
        </p>
      </section>

      {paiements.length > 0 && (
        <>
          <Rule />
          <section>
            <p className="t tk-label">Paiements reçus</p>
            {paiements.map((p) => (
              <div key={p.id} className="tk-line">
                <Row left={`${fmtDate(p.date)} ${fmtTime(p.date)}`} right={fmtMoney(p.montant)} />
                <p className="t tk-small">
                  {p.libelle || 'Paiement'} · {p.compte}
                  {p.par ? ` · ${p.par}` : ''}
                </p>
                <p className="t tk-small">Reste après : {xaf(Math.max(0, p.resteApres))}</p>
              </div>
            ))}
          </section>
        </>
      )}

      {(e.paiement_banque || e.paiement_mobile || e.conditions) && (
        <>
          <Rule />
          <section>
            <p className="t tk-label">Modalités de paiement</p>
            {e.paiement_banque && <p className="t tk-small">Banque : {e.paiement_banque}</p>}
            {e.paiement_mobile && <p className="t tk-small">Mobile money : {e.paiement_mobile}</p>}
            {e.conditions && <p className="t tk-small">{e.conditions}</p>}
          </section>
        </>
      )}

      <Rule />
      <footer className="tk-center">
        {e.mentions && <p className="t tk-small">{e.mentions}</p>}
        <p className="t tk-small">Merci de votre confiance.</p>
      </footer>
    </article>
  )
}
