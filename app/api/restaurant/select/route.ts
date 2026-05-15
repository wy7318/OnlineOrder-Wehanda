import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.redirect(new URL('/select-restaurant', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.redirect(new URL('/select-restaurant', request.url))
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  response.cookies.set('selected_restaurant_id', id, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })
  return response
}
