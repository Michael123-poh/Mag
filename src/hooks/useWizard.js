import { useEffect, useState } from 'react'

const SWAP_FALLBACK_MS = 2000 // sécurité : si la fin de l'animation n'est jamais signalée, on passe quand même à la suite

// Formulaire en plusieurs parties (création d'un client, d'une prestation…).
//  - step : partie en cours (cercle orange, la voiture roule jusqu'à lui)
//  - view : partie affichée (1, 2, 3… ou 'done' à la fin)
//  - swap(to) : les champs actuels sortent en glissant, puis la partie « to » entre (durées : --swap-ms et --drive dans clientNouveau.css)
//  - shakeInvalid() : fait trembler les champs mal remplis, à chaque appui sur Suivant / Valider
//  - fieldsProps : à poser sur le bloc qui contient les champs de la partie affichée
//  - attachForm : à poser en « ref » sur le <form>
export function useWizard() {
  const [step, setStep] = useState(1)
  const [view, setView] = useState(1)
  const [locked, setLocked] = useState(false) // les champs glissent vers une autre partie : boutons inactifs
  const [dir, setDir] = useState(null) // sens du glissement : 'next' (Suivant) ou 'prev' (Retour)
  const [tried, setTried] = useState(false) // un appui sur Suivant / Valider a déjà eu lieu : les erreurs s'affichent
  const [form, setForm] = useState(null) // le <form> (reçu par ref callback)

  // Fin de la sortie des champs : on affiche la partie demandée
  const arrive = (to) => {
    setView(to)
    setLocked(false)
  }

  // Sécurité : si la fin de la sortie n'est jamais signalée, on passe quand même à la partie demandée
  useEffect(() => {
    if (!locked) return
    const t = setTimeout(() => {
      setView(step)
      setLocked(false)
    }, SWAP_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [locked, step])

  const swap = (to) => {
    setDir(to > step ? 'next' : 'prev')
    setStep(to)
    setLocked(true)
    setTried(false)
  }

  const shakeInvalid = () => {
    requestAnimationFrame(() => {
      form?.querySelectorAll('[data-invalid="true"]').forEach((el) => {
        el.classList.remove('nc-shake')
        void el.offsetWidth // relance l'animation
        el.classList.add('nc-shake')
      })
    })
  }

  const fieldsProps = {
    className: 'nc-fields w-full',
    'data-leaving': locked,
    'data-dir': dir ?? undefined,
    onAnimationEnd: (e) => e.target === e.currentTarget && locked && e.animationName.startsWith('nc-out') && arrive(step),
  }

  return { step, view, setView, locked, tried, setTried, attachForm: setForm, swap, shakeInvalid, fieldsProps }
}
