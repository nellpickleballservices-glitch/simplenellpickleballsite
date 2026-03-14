const PROTECTED_PREFIXES = ['/member/', '/admin/', '/dashboard']
const AUTH_REDIRECT_ROUTES = ['/login', '/signup']
const RESERVATION_SEGMENTS = ['/reservations', '/checkout-session']

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname.includes(prefix))
}

export function isAuthRedirectRoute(pathname: string): boolean {
  // Match /login, /signup, /en/login, /en/signup — but NOT /member/login
  // Strip optional locale prefix to get the effective path
  const localePattern = /^\/[a-z]{2}(?=\/|$)/
  const stripped = pathname.replace(localePattern, '') || '/'
  return AUTH_REDIRECT_ROUTES.includes(stripped)
}

export function needsAuthCheck(pathname: string): boolean {
  return isProtectedRoute(pathname) || isAuthRedirectRoute(pathname)
}

export function isReservationRoute(pathname: string): boolean {
  return RESERVATION_SEGMENTS.some(segment => pathname.includes(segment))
}
