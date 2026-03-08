'use client'

import { useState, useActionState } from 'react'
import { signUpAction, AuthActionResult } from '@/app/actions/auth'
import { validateName } from '@/lib/utils/normalizeName'

const initialState: AuthActionResult = {}

export default function SignupForm() {
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
            {/* TODO: i18n */}
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            onBlur={(e) => handleNameBlur('firstName', e.target.value, setFirstNameError)}
            className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
          />
          {firstErr && <p className="text-red-400 text-sm mt-1">{firstErr}</p>}
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="lastName" className="text-offwhite text-sm font-medium">
            {/* TODO: i18n */}
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            onBlur={(e) => handleNameBlur('lastName', e.target.value, setLastNameError)}
            className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
          />
          {lastErr && <p className="text-red-400 text-sm mt-1">{lastErr}</p>}
        </div>
      </div>

      {/* Email */}
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

      {/* Phone (optional) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-offwhite text-sm font-medium">
          {/* TODO: i18n */}
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-offwhite text-sm font-medium">
          {/* TODO: i18n */}
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.password && (
          <p className="text-red-400 text-sm mt-1">{state.errors.password}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-offwhite text-sm font-medium">
          {/* TODO: i18n */}
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="bg-charcoal text-offwhite border border-[#2A2A2A] focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.confirmPassword && (
          <p className="text-red-400 text-sm mt-1">{state.errors.confirmPassword}</p>
        )}
      </div>

      {/* Plan selection — optional */}
      <div className="flex flex-col gap-3">
        <p className="text-offwhite text-sm font-medium">
          {/* TODO: i18n */}
          Choose a plan (optional)
        </p>
        <div className="flex gap-4">
          {/* VIP plan card */}
          <button
            type="button"
            onClick={() => setSelectedPlan(selectedPlan === 'vip' ? null : 'vip')}
            className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
              selectedPlan === 'vip'
                ? 'border-lime bg-lime/10'
                : 'border-[#1ED6C3] bg-[#0B1D3A]'
            }`}
          >
            <p className="text-offwhite font-bold text-lg">
              {/* TODO: i18n */}
              VIP Nell-Picker
            </p>
            <p className="text-lime font-bold text-2xl mt-1">$50<span className="text-sm font-normal text-offwhite/70">/mo</span></p>
            <ul className="mt-2 space-y-1 text-offwhite/80 text-sm">
              {/* TODO: i18n */}
              <li>All locations</li>
              <li>Priority court booking</li>
              <li>Member events access</li>
            </ul>
          </button>

          {/* Basic plan card */}
          <button
            type="button"
            onClick={() => setSelectedPlan(selectedPlan === 'basic' ? null : 'basic')}
            className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
              selectedPlan === 'basic'
                ? 'border-lime bg-lime/10'
                : 'border-[#1ED6C3] bg-[#0B1D3A]'
            }`}
          >
            <p className="text-offwhite font-bold text-lg">
              {/* TODO: i18n */}
              Basic Nell-Picker
            </p>
            <p className="text-lime font-bold text-2xl mt-1">$35<span className="text-sm font-normal text-offwhite/70">/mo</span></p>
            <ul className="mt-2 space-y-1 text-offwhite/80 text-sm">
              {/* TODO: i18n */}
              <li>One location</li>
              <li>Standard court booking</li>
              <li>Member events access</li>
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
        {/* TODO: i18n */}
        {isPending ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="text-offwhite/60 text-sm text-center">
        {/* TODO: i18n */}
        Already have an account?{' '}
        <a href="/login" className="text-turquoise hover:underline">
          {/* TODO: i18n */}
          Sign in
        </a>
      </p>
    </form>
  )
}
