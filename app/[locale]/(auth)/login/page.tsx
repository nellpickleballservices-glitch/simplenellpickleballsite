import { getTranslations } from 'next-intl/server'
import LoginForm from './LoginForm'

async function LoginPage() {
  const t = await getTranslations('Auth.login')
  const tBrand = await getTranslations('Brand')

  return (
    <main className="min-h-screen bg-midnight flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* NELL Logo */}
        <div className="text-center mb-8">
          <h1 className="text-lime font-bebas text-5xl tracking-widest">
            {tBrand('name')}
          </h1>
          <p className="text-offwhite/60 text-sm mt-1">
            {tBrand('tagline')}
          </p>
        </div>

        <div className="bg-[#0B1D3A] border border-[#1ED6C3] rounded-2xl shadow-xl p-8">
          <h2 className="text-offwhite font-bold text-2xl mb-6 text-center">
            {t('title')}
          </h2>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}

export default LoginPage
