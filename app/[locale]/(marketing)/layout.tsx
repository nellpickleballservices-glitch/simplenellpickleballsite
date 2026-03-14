import { getLocale } from 'next-intl/server'
import { Footer } from '@/components/Footer'
import { ChatWidget } from '@/components/chatbot/ChatWidget'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <>
      {children}
      <Footer />
      <ChatWidget locale={locale} />
    </>
  )
}
