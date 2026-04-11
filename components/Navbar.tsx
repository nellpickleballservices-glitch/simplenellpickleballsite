import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MobileNav } from '@/components/public/MobileNav'
import { NavLink } from '@/components/public/NavLink'
import { logoutAction } from '@/app/actions/auth'
import { ScrollProgress } from '@/components/public/ScrollProgress'

export async function Navbar() {
  const t = await getTranslations('Nav')
  const tBilling = await getTranslations('Billing')
  const tReservations = await getTranslations('Reservations')
  const tAdmin = await getTranslations('Admin')
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] = null
  let firstName: string | null = null
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
    isAdmin = user?.app_metadata?.role === 'admin'
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
      firstName = profile?.first_name ?? user.user_metadata?.first_name ?? null
    }
  } catch {
    // Network error reaching Supabase — render as logged-out
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-midnight/95 backdrop-blur-md border-b border-charcoal px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between relative overflow-x-hidden">
      {/* Brand */}
      <Link href="/" className="flex items-center shrink-0">
        <Image src="/images/icons/NellLogo.png" alt="NELL" width={150} height={75} priority className="h-[75px] w-[150px] sm:h-[100px] sm:w-[200px] scale-125 origin-left drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]" />
      </Link>

      {/* Desktop nav */}
      <div className="hidden lg:flex items-center gap-6">
        {/* Public page links */}
        <NavLink href="/#packages">{t('reservations')}</NavLink>
        <NavLink href="/learn-pickleball">{t('learn')}</NavLink>
        <NavLink href="/gallery">{t('gallery')}</NavLink>
        <NavLink href="/contact">{t('contact')}</NavLink>
        {user ? (
          <>
            <NavLink href="/dashboard">{firstName ?? t('dashboard')}</NavLink>
            {isAdmin && (
              <NavLink href="/n3ll-admin-x9k2">{tAdmin('adminNav')}</NavLink>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-bungee text-sm text-offwhite hover:text-lime transition-colors"
              >
                {t('logout')}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="font-bungee text-sm text-offwhite hover:text-lime transition-colors"
            >
              {t('login')}
            </Link>
            <Link
              href="/signup"
              className="font-bungee text-sm bg-lime text-midnight px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('signup')}
            </Link>
          </>
        )}
        <LanguageSwitcher />
      </div>

      {/* Mobile nav */}
      <MobileNav user={user} firstName={firstName} isAdmin={isAdmin} />

      {/* Scroll progress bar — bottom edge of navbar */}
      <ScrollProgress />
    </nav>
  )
}
