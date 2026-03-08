'use client'

import { useActionState } from 'react'
import { resetPasswordAction, AuthActionResult } from '@/app/actions/auth'

const initialState: AuthActionResult = {}

export default function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

  if (state.message && !state.errors) {
    // Success state — email sent
    return (
      <div className="text-center">
        <p className="text-lime font-semibold text-lg mb-2">
          {/* TODO: i18n */}
          Check your inbox
        </p>
        <p className="text-offwhite/70 text-sm">
          {/* TODO: i18n */}
          {state.message}
        </p>
        <a
          href="/login"
          className="inline-block mt-6 text-turquoise hover:underline text-sm"
        >
          {/* TODO: i18n */}
          Back to login
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="text-offwhite/70 text-sm text-center">
        {/* TODO: i18n */}
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-offwhite text-sm font-medium">
          {/* TODO: i18n */}
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {state.message && (
        <p className="text-red-400 text-sm text-center">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-lime text-midnight font-bold rounded-full py-3 px-6 hover:scale-105 hover:bg-sunset transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* TODO: i18n */}
        {isPending ? 'Sending...' : 'Send Reset Link'}
      </button>

      <a href="/login" className="text-offwhite/60 text-sm text-center hover:underline">
        {/* TODO: i18n */}
        Back to login
      </a>
    </form>
  )
}
