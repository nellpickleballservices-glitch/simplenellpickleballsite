'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import type { ReactNode } from 'react'

interface Value {
  icon: ReactNode
  title: string
  description: string
}

interface ValueTimelineProps {
  values: Value[]
}

const accentColors = [
  'text-lime border-lime/30',
  'text-turquoise border-turquoise/30',
  'text-sunset border-sunset/30',
  'text-lime border-lime/30',
  'text-turquoise border-turquoise/30',
  'text-sunset border-sunset/30',
]

const dotColors = [
  'bg-lime',
  'bg-turquoise',
  'bg-sunset',
  'bg-lime',
  'bg-turquoise',
  'bg-sunset',
]

export function ValueTimeline({ values }: ValueTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line — center on desktop, left on mobile */}
      <div
        className="absolute left-6 lg:left-1/2 lg:-translate-x-px top-0 bottom-0 w-0.5"
        style={{
          background: 'linear-gradient(to bottom, #39FF14, #1ED6C3, #FF6B2C)',
        }}
      />

      <div className="flex flex-col gap-12 lg:gap-16">
        {values.map((value, index) => {
          const isLeft = index % 2 === 0
          const accent = accentColors[index % accentColors.length]
          const dot = dotColors[index % dotColors.length]

          return (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="relative flex items-start lg:items-center">
                {/* Dot on the timeline */}
                <div
                  className={`absolute left-6 lg:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${dot} ring-4 ring-midnight z-10`}
                />

                {/* Desktop: alternating sides */}
                <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 w-full">
                  {isLeft ? (
                    <>
                      <div className="flex justify-end pr-12">
                        <div
                          className={`bg-charcoal border ${accent.split(' ')[1]} rounded-2xl p-6 max-w-md text-right`}
                        >
                          <div className={`flex items-center justify-end gap-3 mb-3 ${accent.split(' ')[0]}`}>
                            <h3 className="font-bebas-neue text-2xl tracking-wide text-offwhite">
                              {value.title}
                            </h3>
                            <div className="w-10 h-10 flex items-center justify-center">
                              {value.icon}
                            </div>
                          </div>
                          <p className="text-offwhite/70 text-sm leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>
                      <div />
                    </>
                  ) : (
                    <>
                      <div />
                      <div className="pl-12">
                        <div
                          className={`bg-charcoal border ${accent.split(' ')[1]} rounded-2xl p-6 max-w-md`}
                        >
                          <div className={`flex items-center gap-3 mb-3 ${accent.split(' ')[0]}`}>
                            <div className="w-10 h-10 flex items-center justify-center">
                              {value.icon}
                            </div>
                            <h3 className="font-bebas-neue text-2xl tracking-wide text-offwhite">
                              {value.title}
                            </h3>
                          </div>
                          <p className="text-offwhite/70 text-sm leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile: single column, card to the right of line */}
                <div className="lg:hidden pl-14 w-full">
                  <div
                    className={`bg-charcoal border ${accent.split(' ')[1]} rounded-2xl p-5`}
                  >
                    <div className={`flex items-center gap-3 mb-3 ${accent.split(' ')[0]}`}>
                      <div className="w-8 h-8 flex items-center justify-center">
                        {value.icon}
                      </div>
                      <h3 className="font-bebas-neue text-xl tracking-wide text-offwhite">
                        {value.title}
                      </h3>
                    </div>
                    <p className="text-offwhite/70 text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    </div>
  )
}
