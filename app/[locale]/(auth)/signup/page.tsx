import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import SignupForm from './SignupForm'

async function SignupPage() {
  const t = await getTranslations('Auth.signup')
  const tBrand = await getTranslations('Brand')

  return (
    <main className="min-h-screen bg-midnight flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-3xl">
        {/* NELL Logo */}
        <div className="text-center mb-8">
          <Image src="/images/icons/NellLogo.png" alt="NELL" width={200} height={100} className="h-[100px] w-[200px] mx-auto" />
          <p className="text-white/90 text-sm mt-3">
            {tBrand('tagline')}
          </p>
        </div>

        <div className="bg-[#0F172A] border border-[#38BDF8] rounded-2xl shadow-xl p-8">
          <h2 className="text-offwhite font-bold text-2xl mb-6 text-center">
            {t('title')}
          </h2>
          <SignupForm />
        </div>
      </div>
    </main>
  )
}

export default SignupPage
