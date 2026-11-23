import { User } from 'lucide-react'

const tones = {
  orange: 'bg-[#c8733f]',
  cream: 'bg-[#e8dcc0]',
  dark: 'bg-[#3a4452]',
  teal: 'bg-[#2bbfb0]',
}

export default function Avatar({ tone = 'teal', size = 32, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-gaia-900 ${className.includes('ring-0') ? '' : 'ring-2 ring-gaia-700'} ${tones[tone]} ${className}`}
      style={{ width: size, height: size }}
    >
      <User size={size * 0.6} strokeWidth={2.6} fill="currentColor" />
    </span>
  )
}
