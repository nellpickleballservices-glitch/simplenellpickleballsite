interface PlaceholderImageProps {
  label: string
  aspect?: 'video' | 'square' | 'wide'
  icon?: string
}

const aspects = {
  video: 'aspect-video',
  square: 'aspect-square',
  wide: 'aspect-[21/9]',
}

export function PlaceholderImage({
  label,
  aspect = 'video',
  icon = '📷',
}: PlaceholderImageProps) {
  return (
    <div
      className={`${aspects[aspect]} w-full rounded-2xl bg-gradient-to-br from-charcoal to-slate/60 border border-charcoal flex flex-col items-center justify-center gap-2 overflow-hidden`}
    >
      <span className="text-4xl">{icon}</span>
      <span className="text-offwhite/40 text-sm font-medium tracking-wide">
        {label}
      </span>
    </div>
  )
}
