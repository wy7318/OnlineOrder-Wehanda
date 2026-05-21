import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: { users } }, { data: restaurants }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('restaurants').select('id, name, owner_user_id'),
  ])

  const restaurantsByOwner = (restaurants ?? []).reduce<Record<string, { id: string; name: string }[]>>(
    (acc, r) => {
      if (!acc[r.owner_user_id]) acc[r.owner_user_id] = []
      acc[r.owner_user_id].push({ id: r.id, name: r.name })
      return acc
    },
    {}
  )

  const result = users.map(u => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    restaurants: restaurantsByOwner[u.id] ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: user?.id, email: user?.email }, { status: 201 })
}
