import { Fragment } from 'react'
import car from '../../assets/car.png'

// Indicateur 1 ──── 2 ──── 3 : le cercle de la partie en cours est orange.
// La voiture démarre cachée derrière le cercle 1 et roule d'un cercle à l'autre quand on change de partie.
//   count : nombre de parties · step : partie en cours (1 à count)
export default function WizardStepper({ count, step }) {
  return (
    <div className="nc-stepper" style={{ '--i': step - 1 }} aria-label={`Étape ${step} sur ${count}`}>
      {Array.from({ length: count }, (_, k) => (
        <Fragment key={k}>
          {k > 0 && <span className="nc-track" aria-hidden="true" />}
          <span className="nc-circle" data-on={step === k + 1}>
            <span className="t nc-step-num">{k + 1}</span>
          </span>
        </Fragment>
      ))}
      <img src={car} alt="" className="nc-car" />
    </div>
  )
}
