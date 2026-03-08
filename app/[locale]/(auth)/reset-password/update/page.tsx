import UpdatePasswordForm from './UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-midnight flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* NELL Logo */}
        <div className="text-center mb-8">
          <h1 className="text-lime font-bebas text-5xl tracking-widest">
            {/* TODO: i18n */}
            NELL
          </h1>
          <p className="text-offwhite/60 text-sm mt-1">
            {/* TODO: i18n */}
            Pickleball Club
          </p>
        </div>

        <div className="bg-[#0B1D3A] border border-[#1ED6C3] rounded-2xl shadow-xl p-8">
          <h2 className="text-offwhite font-bold text-2xl mb-6 text-center">
            {/* TODO: i18n */}
            Set a new password
          </h2>
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  )
}
