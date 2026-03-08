import type { Metadata } from 'next'
import '../globals.css'

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
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}
