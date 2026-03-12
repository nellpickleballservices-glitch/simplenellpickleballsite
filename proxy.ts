import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Always call getUser() — validates JWT with Supabase auth server.
  // Never use the session-based getter — it does not revalidate tokens (security vulnerability).
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect member and admin routes — unauthenticated users go to /login
  if (
    !user &&
    (pathname.includes('/dashboard') || pathname.includes('/admin'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Layer 1 admin route protection: non-admin users accessing /admin/* are redirected home.
  if (user && pathname.includes('/admin')) {
    if (user.app_metadata?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // LOCKED DECISION (CONTEXT.md): Reservation routes are open to ALL authenticated users.
  // Non-members pay per session. Skip membership gate for /reservations and /checkout-session.
  const isReservationRoute =
    pathname.includes('/reservations') || pathname.includes('/checkout-session')

  // LOCKED DECISION (CONTEXT.md): Authenticated but unsubscribed users accessing /member/* go to /pricing.
  // Only active members can access /member/ routes. Queries memberships table via RLS.
  if (user && pathname.includes('/member/') && !isReservationRoute) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active'])
      .maybeSingle()

    const isSubscribed = !!membership
    if (!isSubscribed) {
      const url = request.nextUrl.clone()
      url.pathname = '/pricing'
      return NextResponse.redirect(url)
    }
  }

  // Compose next-intl middleware after Supabase auth check.
  // Copy Supabase auth cookies into the intl response so session is preserved.
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
