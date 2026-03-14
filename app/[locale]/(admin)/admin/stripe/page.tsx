import { getTranslations } from 'next-intl/server'

export default async function AdminStripePage() {
  const t = await getTranslations('Admin')

  return (
    <div>
      <h1 className="text-2xl font-bold text-offwhite mb-6">{t('stripePayments')}</h1>

      <div className="bg-[#1E293B] rounded-lg p-8 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          {/* Stripe accent bar */}
          <div className="w-1 h-10 rounded-full bg-[#635BFF]" />
          <h2 className="text-lg font-semibold text-offwhite">Stripe Dashboard</h2>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          {t('stripeDescription')}
        </p>

        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#635BFF] hover:bg-[#5046e5] text-white font-semibold rounded-lg transition-colors"
        >
          {t('openStripeDashboard')}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  )
}
