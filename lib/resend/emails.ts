import { resend } from './index'

const FROM_ADDRESS = 'NELL Pickleball Club <onboarding@resend.dev>'

const translations = {
  confirmation: {
    en: {
      subject: 'Booking Confirmed — NELL Pickleball Club',
      body: (courtName: string, date: string, time: string) =>
        `Your booking has been confirmed!\n\nCourt: ${courtName}\nDate: ${date}\nTime: ${time}\n\nSee you on the court!\n\n— NELL Pickleball Club`,
    },
    es: {
      subject: 'Reserva Confirmada — NELL Pickleball Club',
      body: (courtName: string, date: string, time: string) =>
        `Tu reserva ha sido confirmada!\n\nCancha: ${courtName}\nFecha: ${date}\nHora: ${time}\n\nNos vemos en la cancha!\n\n— NELL Pickleball Club`,
    },
  },
  reminder: {
    en: {
      subject: 'Session Ending Soon — NELL Pickleball Club',
      body: (courtName: string) =>
        `Your pickleball session on ${courtName} ends in 10 minutes. Please prepare to exit the court so the next group can begin.\n\n— NELL Pickleball Club`,
    },
    es: {
      subject: 'Sesion Terminando Pronto — NELL Pickleball Club',
      body: (courtName: string) =>
        `Tu sesion de pickleball en ${courtName} termina en 10 minutos. Por favor preparate para salir de la cancha para que el proximo grupo pueda comenzar.\n\n— NELL Pickleball Club`,
    },
  },
} as const

type SupportedLocale = 'en' | 'es'

function getLocale(locale: string): SupportedLocale {
  return locale === 'en' ? 'en' : 'es'
}

export async function sendConfirmationEmail(
  to: string,
  courtName: string,
  date: string,
  time: string,
  locale: string
): Promise<void> {
  try {
    const l = getLocale(locale)
    const t = translations.confirmation[l]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: t.subject,
      text: t.body(courtName, date, time),
    })
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}

export async function sendReminderEmail(
  to: string,
  courtName: string,
  locale: string
): Promise<void> {
  try {
    const l = getLocale(locale)
    const t = translations.reminder[l]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: t.subject,
      text: t.body(courtName),
    })
  } catch (error) {
    console.error('Failed to send reminder email:', error)
  }
}
