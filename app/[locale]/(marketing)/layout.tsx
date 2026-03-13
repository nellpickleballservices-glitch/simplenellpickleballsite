import { getLocale } from 'next-intl/server'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { Footer } from '@/components/Footer'
import { WhatsAppBubble } from '@/components/public/WhatsAppBubble'
import { ChatWidget } from '@/components/chatbot/ChatWidget'

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
      <ChatWidget locale={locale} />
    </MotionProvider>
  )
}
