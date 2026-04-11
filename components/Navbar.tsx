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
    <nav className="sticky top-0 z-50 w-full bg-midnight/95 backdrop-blur-md border-b border-charcoal px-3 py-3 flex items-center justify-between relative">
      {/* Brand */}
      <Link href="/" className="flex items-center shrink-0 min-w-0">
        <Image src="/images/icons/NellLogo.png" alt="NELL" width={120} height={60} priority className="h-[60px] w-[120px] sm:h-[75px] sm:w-[150px] md:h-[100px] md:w-[200px] origin-left drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]" />
      </Link>

      {/* Desktop nav — smaller on tablet, full size at 1024px+ */}
      <div className="hidden min-[500px]:flex items-center gap-2 lg:gap-5">
        {/* Public page links */}
        <NavLink href="/#packages" className="text-xs lg:text-sm">{t('reservations')}</NavLink>
        <NavLink href="/learn-pickleball" className="text-xs lg:text-sm">{t('learn')}</NavLink>
        <NavLink href="/gallery" className="text-xs lg:text-sm">{t('gallery')}</NavLink>
        <NavLink href="/contact" className="text-xs lg:text-sm">{t('contact')}</NavLink>
        {user ? (
          <>
            <NavLink href="/dashboard" className="text-xs lg:text-sm">{firstName ?? t('dashboard')}</NavLink>
            {isAdmin && (
              <NavLink href="/n3ll-admin-x9k2" className="text-xs lg:text-sm">{tAdmin('adminNav')}</NavLink>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-bungee text-xs lg:text-sm text-offwhite hover:text-lime transition-colors"
              >
                {t('logout')}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="font-bungee text-xs lg:text-sm text-offwhite hover:text-lime transition-colors"
            >
              {t('login')}
            </Link>
            <Link
              href="/signup"
              className="font-bungee text-xs lg:text-sm bg-lime text-midnight px-3 py-1 lg:px-4 lg:py-1.5 rounded-full hover:opacity-90 transition-opacity"
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
