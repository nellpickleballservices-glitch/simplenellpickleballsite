'use client'

import { useState, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { signUpAction, AuthActionResult } from '@/app/actions/auth'
import { validateName } from '@/lib/utils/normalizeName'
import { CountrySelect } from '@/components/CountrySelect'

const initialState: AuthActionResult = {}

export default function SignupForm() {
  const t = useTranslations('Auth.signup')
  const locale = useLocale()
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)

  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  function handleNameBlur(
    field: 'firstName' | 'lastName',
    value: string,
    setError: (err: string | null) => void,
  ) {
    setError(validateName(value))
  }

  // Server-side field errors override client-side on submit
  const firstErr = state.errors?.firstName ?? firstNameError
  const lastErr = state.errors?.lastName ?? lastNameError

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Name row */}
      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="firstName" className="text-offwhite text-sm font-medium">
            {t('firstName')}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            onBlur={(e) => handleNameBlur('firstName', e.target.value, setFirstNameError)}
            className="bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
          />
          {firstErr && <p className="text-red-400 text-sm mt-1">{firstErr}</p>}
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="lastName" className="text-offwhite text-sm font-medium">
            {t('lastName')}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            onBlur={(e) => handleNameBlur('lastName', e.target.value, setLastNameError)}
            className="bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
          />
          {lastErr && <p className="text-red-400 text-sm mt-1">{lastErr}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-offwhite text-sm font-medium">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {/* Phone (optional) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-offwhite text-sm font-medium">
          {t('phone')}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {/* Country */}
      <CountrySelect
        name="country"
        label={t('country')}
        locale={locale as 'en' | 'es'}
        defaultValue="DO"
      />
      {state.errors?.country && (
        <p className="text-red-400 text-sm mt-1">{state.errors.country}</p>
      )}

      {/* Password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-offwhite text-sm font-medium">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.password && (
          <p className="text-red-400 text-sm mt-1">{state.errors.password}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-offwhite text-sm font-medium">
          {t('confirmPassword')}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.confirmPassword && (
          <p className="text-red-400 text-sm mt-1">{state.errors.confirmPassword}</p>
        )}
      </div>

      {/* Plan selection — optional */}
      <div className="flex flex-col gap-3">
        <p className="text-offwhite text-sm font-medium">
          {t('planSelectionTitle')}
        </p>
        <div className="flex gap-4">
          {/* VIP plan card */}
          <button
            type="button"
            onClick={() => setSelectedPlan(selectedPlan === 'vip' ? null : 'vip')}
            className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
              selectedPlan === 'vip'
                ? 'border-lime bg-lime/10'
                : 'border-[#38BDF8] bg-[#0F172A]'
            }`}
          >
            <p className="text-offwhite font-bold text-lg">
              {t('planVipName')}
            </p>
            <p className="text-lime font-bold text-2xl mt-1">$50<span className="text-sm font-normal text-offwhite/70">/mo</span></p>
            <ul className="mt-2 space-y-1 text-offwhite/80 text-sm">
              <li>{t('planVipFeature1')}</li>
              <li>{t('planVipFeature2')}</li>
              <li>{t('planVipFeature3')}</li>
            </ul>
          </button>

          {/* Basic plan card */}
          <button
            type="button"
            onClick={() => setSelectedPlan(selectedPlan === 'basic' ? null : 'basic')}
            className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
              selectedPlan === 'basic'
                ? 'border-lime bg-lime/10'
                : 'border-[#38BDF8] bg-[#0F172A]'
            }`}
          >
            <p className="text-offwhite font-bold text-lg">
              {t('planBasicName')}
            </p>
            <p className="text-lime font-bold text-2xl mt-1">$35<span className="text-sm font-normal text-offwhite/70">/mo</span></p>
            <ul className="mt-2 space-y-1 text-offwhite/80 text-sm">
              <li>{t('planBasicFeature1')}</li>
              <li>{t('planBasicFeature2')}</li>
              <li>{t('planBasicFeature3')}</li>
            </ul>
          </button>
        </div>
        {/* Hidden input carries selected plan to Server Action */}
        <input type="hidden" name="planType" value={selectedPlan ?? ''} />
      </div>

      {/* Global error message */}
      {state.message && (
        <p className="text-red-400 text-sm text-center">{state.message}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="bg-lime text-midnight font-bold rounded-full py-3 px-6 hover:scale-105 hover:bg-sunset transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('submittingButton') : t('submitButton')}
      </button>

      <p className="text-offwhite/60 text-sm text-center">
        {t('alreadyHaveAccount')}{' '}
        <a href="/login" className="text-turquoise hover:underline">
          {t('loginLink')}
        </a>
      </p>
    </form>
  )
}
