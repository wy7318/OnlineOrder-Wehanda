import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function requirePlatformAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const ok = await isPlatformAdmin(user.id)
  return ok ? { userId: user.id } : null
}
