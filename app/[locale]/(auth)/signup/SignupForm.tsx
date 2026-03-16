'use client'

import { useState, useRef, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { signUpAction, AuthActionResult } from '@/app/actions/auth'
import { validateName } from '@/lib/utils/normalizeName'
import { CountrySelect } from '@/components/CountrySelect'

const initialState: AuthActionResult = {}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function SignupForm() {
  const t = useTranslations('Auth.signup')
  const locale = useLocale()
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)

  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState<string | null>(null)

  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  function handleNameBlur(
    field: 'firstName' | 'lastName',
    value: string,
    setError: (err: string | null) => void,
  ) {
    setError(validateName(value))
  }

  function handleSubmit(formData: FormData) {
    setPasswordMismatch(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setPasswordMismatch(
        locale === 'en' ? 'Passwords do not match' : 'Las contrasenas no coinciden',
      )
      // Clear only password fields, keep everything else
      if (passwordRef.current) passwordRef.current.value = ''
      if (confirmRef.current) confirmRef.current.value = ''
      confirmRef.current?.focus()
      return
    }

    formAction(formData)
  }

  // Server-side field errors override client-side on submit
  const firstErr = state.errors?.firstName ?? firstNameError
  const lastErr = state.errors?.lastName ?? lastNameError

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
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
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 pr-11 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-offwhite/50 hover:text-offwhite transition-colors"
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        {state.errors?.password && (
          <p className="text-red-400 text-sm mt-1">{state.errors.password}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-offwhite text-sm font-medium">
          {t('confirmPassword')}
        </label>
        <div className="relative">
          <input
            ref={confirmRef}
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            className="w-full bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5 pr-11 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-offwhite/50 hover:text-offwhite transition-colors"
            tabIndex={-1}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {(passwordMismatch || state.errors?.confirmPassword) && (
          <p className="text-red-400 text-sm mt-1">
            {passwordMismatch ?? state.errors?.confirmPassword}
          </p>
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
