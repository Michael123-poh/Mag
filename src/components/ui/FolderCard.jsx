import { SlidersHorizontal } from 'lucide-react'
import Avatar from './Avatar.jsx'

const avatarTones = ['orange', 'cream', 'dark', 'teal']

// prefix : préfixe des classes de la carte (ex. "cl-folder") :
//   cl-folder-card (taille), cl-folder-title / -count / -caption / -avatars / -tab (textes et position)
// onSelect : si fourni, cliquer sur le dossier applique directement le filtre de la carte (selected = carte active).
// onTabClick : si fourni, toute la languette (partie bleu clair) devient un bouton cliquable (personnaliser le filtre).
export default function FolderCard({
  title,
  count,
  caption,
  prefix = 'folder',
  onSelect,
  selected = false,
  onTabClick,
  tabActive = false,
  tabLabel = 'Filtrer',
}) {
  return (
    <div className={`${prefix}-card relative mx-auto aspect-[266/202] w-full`}>
      {/* Le dossier est découpé : la languette est détachée du corps, le fond gris passe entre les deux. */}
      <svg
        viewBox="0 0 266 202"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <path
          d="M0 26 Q0 0 26 0 H104 L138 49 H266 V176 Q266 202 240 202 H26 Q0 202 0 176 Z"
          className={`transition-colors duration-200 ${selected ? 'fill-gaia-900' : 'fill-gaia-700'}`}
        />
        <path
          d="M113 4 H236 Q262 4 262 30 V44 H140.5 Z"
          className="fill-gaia-500"
        />
      </svg>

      {onSelect && (
        // Zone cliquable calquée sur le corps du dossier (sans la languette)
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Filtrer le tableau : ${title}`}
          className="absolute inset-0 cursor-pointer outline-none"
          style={{ clipPath: 'polygon(0 0, 39.1% 0, 51.9% 24.3%, 100% 24.3%, 100% 100%, 0 100%)' }}
        />
      )}

      <div className="pointer-events-none relative flex h-full flex-col justify-end px-[7%] pb-[6%] pt-[26%] text-white">
        <p className={`t ${prefix}-title`}>{title}</p>
        <p className={`t ${prefix}-count mt-1`}>{count}</p>
        <div className={`t ${prefix}-avatars mt-2 flex`}>
          {avatarTones.map((tone, i) => (
            <Avatar key={tone} tone={tone} size={30} className={i ? '-ml-1' : ''} />
          ))}
        </div>
        <p className={`t ${prefix}-caption mt-1`}>{caption}</p>
      </div>

      {onTabClick && (
        // Zone cliquable calquée sur la forme de la languette (même géométrie que le tracé SVG)
        <button
          type="button"
          onClick={onTabClick}
          aria-expanded={tabActive}
          aria-label={`${tabLabel} : ${title}`}
          className="absolute z-10 flex cursor-pointer items-center justify-center gap-1.5 pl-[10%] text-white outline-none"
          style={{
            left: '42.48%',
            top: '1.98%',
            width: '56.02%',
            height: '19.8%',
            clipPath: 'polygon(0 0, 82.55% 0, 100% 65%, 100% 100%, 18.46% 100%)',
          }}
        >
          <SlidersHorizontal size={14} strokeWidth={2.4} />
          <span className={`t ${prefix}-tab`}>{tabLabel}</span>
        </button>
      )}
    </div>
  )
}
