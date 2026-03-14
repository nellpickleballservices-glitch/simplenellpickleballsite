import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MobileNav } from '@/components/public/MobileNav'
import { NavLink } from '@/components/public/NavLink'
import { logoutAction } from '@/app/actions/auth'

export async function Navbar() {
  const t = await getTranslations('Nav')
  const tBilling = await getTranslations('Billing')
  const tReservations = await getTranslations('Reservations')
  const tAdmin = await getTranslations('Admin')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let firstName: string | null = null
  const isAdmin = user?.app_metadata?.role === 'admin'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()
    firstName = profile?.first_name ?? null
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-midnight/95 backdrop-blur-md border-b border-charcoal px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link href="/" className="font-bungee text-2xl text-lime tracking-widest">
        NELL
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        {/* Public page links */}
        <NavLink href="/about">{t('about')}</NavLink>
        <NavLink href="/learn-pickleball">{t('learn')}</NavLink>
        <NavLink href="/events">{t('events')}</NavLink>
        <NavLink href="/contact">{t('contact')}</NavLink>
        <NavLink href="/pricing">{tBilling('pricingNav')}</NavLink>

        {user ? (
          <>
            <NavLink href="/reservations">{tReservations('navLink')}</NavLink>
            <NavLink href="/dashboard">{firstName ?? t('dashboard')}</NavLink>
            {isAdmin && (
              <NavLink href="/admin">{tAdmin('adminNav')}</NavLink>
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
    </nav>
  )
}
