'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { AuthActionResult } from '@/app/actions/auth'
import { completeOAuthProfileAction } from './actions'

const initialState: AuthActionResult = {}

export default function CompleteProfileForm() {
  const t = useTranslations('Auth.completeProfile')
  const [state, formAction, isPending] = useActionState(completeOAuthProfileAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="text-offwhite/70 text-sm text-center">
        {t('description')}
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-offwhite text-sm font-medium">
          {t('phone')}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="+1 (829) 555-0000"
          className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.phone && (
          <p className="text-red-400 text-sm mt-1">{state.errors.phone}</p>
        )}
      </div>

      {state.message && (
        <p className="text-red-400 text-sm text-center">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-lime text-midnight font-bold rounded-full py-3 px-6 hover:scale-105 hover:bg-sunset transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('savingButton') : t('submitButton')}
      </button>
    </form>
  )
}
