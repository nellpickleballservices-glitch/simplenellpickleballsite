import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/server'
import WelcomeBanner from './WelcomeBanner'

interface HomePageProps {
  searchParams: Promise<{ welcome?: string }>
}

async function HomePage({ searchParams }: HomePageProps) {
  const t = useTranslations('Home')
  const params = await searchParams
  const showWelcome = params.welcome === '1'

  let firstName = ''

  if (showWelcome) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Try profile first_name, fall back to user_metadata, then email prefix
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
      firstName = profile?.first_name ?? user.user_metadata?.first_name ?? user.email?.split('@')[0] ?? ''
    }
  }

  return (
    <main className="min-h-screen bg-midnight">
      {showWelcome && firstName && <WelcomeBanner firstName={firstName} />}

      <section className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <h1 className="text-lime font-bebas text-7xl tracking-widest mb-4">
          {t('title')}
        </h1>
        <p className="text-offwhite text-xl max-w-lg mb-2">
          {t('subtitle')}
        </p>
        <p className="text-offwhite/60 text-base max-w-lg mb-8">
          {t('location')}
        </p>
        <a
          href="/signup"
          className="bg-lime text-midnight font-bold rounded-full py-4 px-10 text-lg hover:scale-105 hover:bg-sunset transition-all"
        >
          {t('joinButton')}
        </a>
      </section>
    </main>
  )
}

export default HomePage
