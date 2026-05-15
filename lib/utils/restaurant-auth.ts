import { createClient } from '@/lib/supabase/server'

export interface RestaurantContext {
  restaurantId: string
  userId: string
}

export async function getRestaurantContext(): Promise<RestaurantContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!data) return null
  return { restaurantId: data.id, userId: user.id }
}
