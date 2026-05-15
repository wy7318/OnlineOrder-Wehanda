import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null)

  const cookieStore = await cookies()
  const selectedId = cookieStore.get('selected_restaurant_id')?.value

  if (selectedId) {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', selectedId)
      .eq('owner_user_id', user.id)
      .single()
    if (data) return NextResponse.json(data)
  }

  // Fallback: first restaurant owned by user
  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return NextResponse.json(data ?? null)
}
