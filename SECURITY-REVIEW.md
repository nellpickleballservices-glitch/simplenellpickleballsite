# Security Review — NELL Pickleball Club

**Date:** 2026-03-15 | **Branch:** ecommerceV1

---

### CRITICAL-01 — Real credentials present in `.env.local`

**File:** `.env.local`

The file contains live credentials (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`). Verify it is not tracked in git history.

**Actions:**
1. Run `git log --all -- .env.local` to check if it was ever committed. If yes, purge with `git filter-repo` or BFG.
2. Ensure untracked: `git rm --cached .env.local` if needed.
3. Rotate ALL credentials across all services.
4. Install `gitleaks` or `git-secrets` as a pre-commit hook.

---

### HIGH-01 — No timestamp validation on `startsAt`/`endsAt` in `adminCreateReservationAction`

**File:** `app/actions/admin/reservations.ts` lines 101–108

Client-supplied `startsAt`/`endsAt` are inserted without checking `end > start`, valid ISO format, or reasonable date range.

**Fix:** Validate with `new Date()`, confirm `end > start`, reject timestamps > 90 days out.

---

### HIGH-02 — `heroImageUrl` not validated as HTTP/HTTPS URL

**File:** `app/actions/admin/locations.ts` lines 50–68

No URL protocol validation. A `javascript:` URI could cause XSS; malformed URLs could cause SSRF if fetched server-side.

**Fix:** Validate with `new URL(heroImageUrl)` and check protocol is `'http:'` or `'https:'`.

---

### HIGH-03 — CMS HTML rendered via `dangerouslySetInnerHTML` without sanitization

**Files:** `app/[locale]/(marketing)/about/page.tsx`, `learn-pickleball/page.tsx`, `page.tsx`

Tiptap CMS content rendered directly. If an admin account is compromised, stored XSS affects all visitors.

**Fix:** Add `isomorphic-dompurify` and sanitize before rendering with an allowlist of tags/attributes.

---

### MEDIUM-01 — Chat `sessionId` is client-supplied, rate limit bypassable

**File:** `app/api/chat/route.ts` lines 33–47

Rate limit keyed on client-provided `sessionId`. Any script can generate new UUIDs to bypass.

**Fix:** Supplement with IP-based rate limiting. Validate UUID format.

---

### MEDIUM-02 — `guestName` has no length or content validation

**File:** `app/actions/admin/reservations.ts` lines 99, 137–145

Arbitrary-length strings accepted.

**Fix:** Trim and cap at 100 characters.

---

### MEDIUM-03 — `courtName` has no length validation

**File:** `app/actions/admin/courts.ts` lines 37–42

Only presence check exists.

**Fix:** Add `courtName.trim().length > 100` check.

---

### MEDIUM-04 — Google Maps API key needs referrer/API restrictions

**File:** `components/AddressAutocomplete.tsx` line 43

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exposed client-side without referrer restrictions.

**Fix:** Restrict in Google Cloud Console to production domain and "Maps JavaScript API" + "Places API" only.

---

### MEDIUM-05 — Emails sent from `onboarding@resend.dev` sandbox domain

**Files:** `app/actions/admin/courts.ts` line 215, `app/actions/admin/users.ts` line 190

Sandbox sender domain is prone to spam classification.

**Fix:** Verify custom domain in Resend, update `from` to `noreply@nellpickleball.com`, add DKIM/SPF/DMARC.

---

### LOW-01 — Raw DB error messages returned to admin clients

**Files:** Multiple `app/actions/admin/*.ts`

Supabase error messages may contain schema details.

**Fix:** Log errors server-side, return generic user-facing string.

---

### LOW-02 — `bookingMode` not validated server-side before DB insert

**File:** `app/actions/admin/reservations.ts` line 103, 179

DB constraint catches invalid values but error propagates to client.

**Fix:** `if (!['full_court','open_play'].includes(bookingMode)) return { error: 'Invalid booking mode' }`

---

### LOW-03 — Chat SSE Response missing security headers

**File:** `app/api/chat/route.ts` lines 158–164

Custom `Response` bypasses Next.js global headers.

**Fix:** Add `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.

---

### INFO (no action required)

- `requireAdmin()` correctly reads `user.app_metadata.role` (not `user_metadata`). Secure.
- Stripe webhook verifies signature + idempotency guard. Correct.
- RLS enabled on all tables; service-role key has no `NEXT_PUBLIC_` prefix. Correct.
- No SQL injection — all queries use parameterized Supabase SDK methods.
- `dangerouslySetInnerHTML` in admin CMS preview is admin-only scope, acceptable.
