import type { Metadata } from 'next'
import { Bebas_Neue, Poppins, Bungee } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Navbar } from '@/components/Navbar'
import { MotionProvider } from '@/components/motion/MotionProvider'
import '../globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

const bungee = Bungee({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bungee',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NELL Pickleball Club',
  description: 'Club de pickleball en República Dominicana',
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${bebasNeue.variable} ${poppins.variable} ${bungee.variable}`}>
      <body className="font-poppins">
        <NextIntlClientProvider messages={messages}>
          <MotionProvider>
            <Navbar />
            {children}
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
