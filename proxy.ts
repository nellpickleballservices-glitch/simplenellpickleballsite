import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

  // LOCKED DECISION (CONTEXT.md): Authenticated but unsubscribed users accessing /member/* go to /pricing.
  // Subscription status check is a stub here — Phase 2 (Billing) will harden this by querying
  // the memberships table. For now, the route pattern and redirect are established so downstream
  // phases can rely on this behavior contract.
  if (user && pathname.includes('/member/')) {
    // TODO(Phase 2): Replace stub with real memberships table query:
    //   const { data: membership } = await supabase
    //     .from('memberships')
    //     .select('status')
    //     .eq('user_id', user.id)
    //     .eq('status', 'active')
    //     .maybeSingle()
    //   const isSubscribed = !!membership
    const isSubscribed = false // stub — Phase 2 hardens this
    if (!isSubscribed) {
      const url = request.nextUrl.clone()
      url.pathname = '/pricing'
      return NextResponse.redirect(url)
    }
  }

  // Note: next-intl middleware will be composed here in plan 01-04
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
