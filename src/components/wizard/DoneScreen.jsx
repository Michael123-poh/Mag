import car from '../../assets/car.png'

// Coche verte façon « swoosh » : se dessine d'un trait
function Swoosh() {
  return (
    <svg viewBox="0 0 40 32" className="nc-swoosh" aria-hidden="true">
      <path d="M5 17 C8 19.5 10.5 22.5 13 27 C18 16 25 8 35 3" pathLength="1" />
    </svg>
  )
}

// Écran final : la voiture arrive au centre, un cercle blanc avec une coche verte apparaît dessous.
export default function DoneScreen({ message, buttonLabel, onButton }) {
  return (
    <div className="nc-done flex flex-col items-center">
      <img src={car} alt="" className="nc-done-car" />
      <span className="nc-done-badge flex items-center justify-center rounded-full bg-white" role="img" aria-label="Enregistré">
        <Swoosh />
      </span>
      <p className="t nc-done-text">{message}</p>
      <button type="button" onClick={onButton} className="t nc-button nc-done-button rounded-full bg-gaia-700 text-white">
        {buttonLabel}
      </button>
    </div>
  )
}
