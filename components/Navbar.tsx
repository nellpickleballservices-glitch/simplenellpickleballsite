import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { logoutAction } from '@/app/actions/auth'

export async function Navbar() {
  const t = await getTranslations('Nav')
  const tBilling = await getTranslations('Billing')
  const tReservations = await getTranslations('Reservations')
  const tAdmin = await getTranslations('Admin')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let firstName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()
    firstName = profile?.first_name ?? null
  }

  return (
    <nav className="w-full bg-midnight border-b border-charcoal px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link href="/" className="font-bebas-neue text-2xl text-lime tracking-widest">
        NELL
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-6">
        <Link
          href="/pricing"
          className="text-sm text-offwhite hover:text-lime transition-colors"
        >
          {tBilling('pricingNav')}
        </Link>
        {user ? (
          <>
            <Link
              href="/reservations"
              className="text-sm text-offwhite hover:text-lime transition-colors"
            >
              {tReservations('navLink')}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-offwhite hover:text-lime transition-colors"
            >
              {firstName ?? t('dashboard')}
            </Link>
            {user.app_metadata?.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm text-offwhite hover:text-lime transition-colors"
              >
                {tAdmin('adminNav')}
              </Link>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-offwhite hover:text-lime transition-colors"
              >
                {t('logout')}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm text-offwhite hover:text-lime transition-colors"
            >
              {t('login')}
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-lime text-midnight font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('signup')}
            </Link>
          </>
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
