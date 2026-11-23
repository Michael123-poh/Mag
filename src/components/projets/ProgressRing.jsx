const R = 34
const C = 2 * Math.PI * R

function stroke(pct) {
  if (pct >= 100) return 'stroke-gaia-500'
  if (pct >= 50) return 'stroke-gaia-900'
  return 'stroke-danger'
}

export default function ProgressRing({ pct }) {
  return (
    <div
      className="relative size-[84px]"
      role="img"
      aria-label={`Avancement ${pct} %`}
    >
      <svg viewBox="0 0 84 84" className="size-full -rotate-90">
        <circle cx="42" cy="42" r={R} fill="none" strokeWidth="8" className="stroke-black/5" />
        <circle
          cx="42"
          cy="42"
          r={R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
          className={stroke(pct)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="t pj-ring-pct">{pct} %</span>
      </span>
    </div>
  )
}
