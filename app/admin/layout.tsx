import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/utils/admin-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ok = await isPlatformAdmin(user.id)
  if (!ok) redirect('/dashboard')

  return <>{children}</>
}
