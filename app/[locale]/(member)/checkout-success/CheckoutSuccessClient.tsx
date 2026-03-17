'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type CheckoutStatus = 'pending' | 'active' | 'timeout'

export default function CheckoutSuccessClient() {
  const t = useTranslations('Billing')
  const router = useRouter()
  const [status, setStatus] = useState<CheckoutStatus>('pending')
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: ReturnType<typeof setTimeout>

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if membership is already active (webhook may have fired before redirect)
      const { data: existing } = await supabase
        .from('memberships')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (existing) {
        setStatus('active')
        return
      }

      // Set 60-second timeout
      timeoutId = setTimeout(() => {
        setStatus('timeout')
      }, 60_000)

      // Poll every 3 seconds as fallback (Realtime may lag)
      const pollId = setInterval(async () => {
        const { data } = await supabase
          .from('memberships')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        if (data) {
          clearTimeout(timeoutId)
          clearInterval(pollId)
          setStatus('active')
        }
      }, 3_000)

      // Subscribe to Realtime for membership changes
      const channel = supabase
        .channel('membership-status')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'memberships',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRecord = payload.new as { status?: string }
            if (newRecord?.status === 'active') {
              clearTimeout(timeoutId)
              clearInterval(pollId)
              setStatus('active')
              supabase.removeChannel(channel)
            }
          }
        )
        .subscribe()

      cleanupRef.current = () => {
        clearTimeout(timeoutId)
        clearInterval(pollId)
        supabase.removeChannel(channel)
      }
    }

    init()

    return () => {
      clearTimeout(timeoutId)
      cleanupRef.current?.()
    }
  }, [])

  async function handleCheckStatus() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: membership } = await supabase
      .from('memberships')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membership) {
      setStatus('active')
    }
  }

  // Pending state
  if (status === 'pending') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="text-center px-6">
          <div className="mx-auto mb-8 h-16 w-16 rounded-full border-4 border-[#BFFF00] border-t-transparent animate-spin" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('checkoutPending')}
          </h1>
          <p className="text-gray-400">
            {t('checkoutPendingSubtext')}
          </p>
          {/* Lime pulse accent */}
          <div className="mt-6 mx-auto h-1 w-32 rounded-full bg-[#BFFF00] animate-pulse" />
        </div>
      </main>
    )
  }

  // Active state — success celebration
  if (status === 'active') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0F172A] overflow-hidden relative">
        {/* CSS-only confetti burst */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute block w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 40}%`,
                backgroundColor: ['#BFFF00', '#00D4AA', '#FFD700', '#FF6B6B', '#00BFFF'][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>

        <div className="text-center px-6 relative z-10">
          {/* Success checkmark */}
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-[#BFFF00] flex items-center justify-center animate-scale-in">
            <svg className="h-10 w-10 text-[#0F172A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {t('checkoutSuccess')}
          </h1>
          <p className="text-lg text-[#BFFF00] mb-8">
            {t('checkoutSuccessSubtext')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              disabled
              className="px-6 py-3 rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed relative"
            >
              {t('reserveCourtCta')}
              <span className="absolute -top-2 -right-2 text-xs bg-[#BFFF00] text-[#0F172A] px-2 py-0.5 rounded-full font-semibold">
                {t('comingSoon')}
              </span>
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-lg bg-[#BFFF00] text-[#0F172A] font-semibold hover:bg-[#a8e600] transition-colors"
            >
              {t('goToDashboard')}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg) scale(0); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti 2s ease-out forwards;
          }
          @keyframes scale-in {
            0% { transform: scale(0); }
            60% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          .animate-scale-in {
            animation: scale-in 0.5s ease-out forwards;
          }
        `}</style>
      </main>
    )
  }

  // Timeout state
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="text-center px-6 max-w-md">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t('checkoutTimeout')}
        </h1>
        <p className="text-gray-400 mb-6">
          {t('checkoutTimeoutSubtext')}
        </p>
        <button
          onClick={handleCheckStatus}
          className="px-6 py-3 rounded-lg border-2 border-[#BFFF00] text-[#BFFF00] font-semibold hover:bg-[#BFFF00] hover:text-[#0F172A] transition-colors"
        >
          {t('checkoutTimeoutCta')}
        </button>
      </div>
    </main>
  )
}
