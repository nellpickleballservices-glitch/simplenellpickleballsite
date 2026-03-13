import { getLocale } from 'next-intl/server'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { Footer } from '@/components/Footer'
import { WhatsAppBubble } from '@/components/public/WhatsAppBubble'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <MotionProvider>
      {children}
      <Footer />
      <WhatsAppBubble locale={locale} />
    </MotionProvider>
  )
}
