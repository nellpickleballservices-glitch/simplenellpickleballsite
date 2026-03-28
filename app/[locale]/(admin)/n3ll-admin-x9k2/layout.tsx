import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Layer 2 admin protection: server-side role check before rendering
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.app_metadata?.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar locale={locale} />
      <main className="flex-1 bg-[#0F172A] p-6 overflow-y-auto md:ml-64">
        {children}
      </main>
    </div>
  )
}
