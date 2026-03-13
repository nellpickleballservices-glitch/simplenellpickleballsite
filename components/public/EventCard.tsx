import type { Event } from '@/lib/types/admin'

interface EventCardProps {
  event: Event
  locale: string
}

const typeBadgeStyles: Record<string, string> = {
  tournament: 'bg-sunset text-offwhite',
  training: 'bg-turquoise text-midnight',
  social: 'bg-lime text-midnight',
}

const typeLabels: Record<string, Record<string, string>> = {
  tournament: { en: 'Tournament', es: 'Torneo' },
  training: { en: 'Training', es: 'Entrenamiento' },
  social: { en: 'Social', es: 'Social' },
}

function FallbackIcon({ eventType }: { eventType: string }) {
  if (eventType === 'tournament') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-sunset">
        <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.075.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
      </svg>
    )
  }
  if (eventType === 'training') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-turquoise">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
      </svg>
    )
  }
  // social
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-lime">
      <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
      <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
    </svg>
  )
}

export function EventCard({ event, locale }: EventCardProps) {
  const title = locale === 'en' ? event.title_en : event.title_es
  const description = locale === 'en' ? event.description_en : event.description_es
  const badge = typeBadgeStyles[event.event_type] ?? typeBadgeStyles.social
  const label = typeLabels[event.event_type]?.[locale] ?? event.event_type

  // Format date for locale
  const dateObj = new Date(event.event_date + 'T00:00:00')
  const formattedDate = dateObj.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-DO', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })

  // Format time
  let timeDisplay = ''
  if (event.start_time) {
    const start = event.start_time.slice(0, 5)
    const end = event.end_time ? event.end_time.slice(0, 5) : ''
    timeDisplay = end ? `${start} - ${end}` : start
  }

  return (
    <article className="bg-charcoal border border-charcoal rounded-2xl overflow-hidden hover:scale-[1.02] hover:shadow-xl hover:shadow-lime/5 transition-all duration-200 flex flex-col">
      {/* Image or icon fallback */}
      <div className="relative h-44 bg-midnight flex items-center justify-center overflow-hidden">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <FallbackIcon eventType={event.event_type} />
        )}

        {/* Type badge */}
        <span className={`absolute top-3 right-3 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${badge}`}>
          {label}
        </span>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-bebas-neue text-2xl text-offwhite tracking-wide mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-offwhite/70 text-sm leading-relaxed mb-4 line-clamp-3">
            {description}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-offwhite/10">
          {/* Calendar icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-lime shrink-0">
            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
          </svg>
          <span className="text-offwhite/70 text-sm">{formattedDate}</span>
          {timeDisplay && (
            <>
              <span className="text-offwhite/50">|</span>
              <span className="text-offwhite/70 text-sm">{timeDisplay}</span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
