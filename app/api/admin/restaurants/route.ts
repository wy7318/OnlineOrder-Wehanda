import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils/helpers'

export async function GET() {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: restaurants }, { data: { users } }] = await Promise.all([
    admin.from('restaurants').select('*').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const userMap = new Map(users.map(u => [u.id, u.email ?? '']))

  const result = (restaurants ?? []).map(r => ({
    ...r,
    owner_email: userMap.get(r.owner_user_id) ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, owner_user_id, address, timezone } = body

  if (!name || !owner_user_id) {
    return NextResponse.json({ error: 'name and owner_user_id are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the owner exists
  const { data: owner } = await admin.auth.admin.getUserById(owner_user_id)
  if (!owner.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Generate unique slug
  let slug = slugify(name)
  const { data: existing } = await admin.from('restaurants').select('slug').eq('slug', slug).single()
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  const { data, error } = await admin
    .from('restaurants')
    .insert({
      name,
      slug,
      owner_user_id,
      is_active: true,
      address: address ?? null,
      timezone: timezone ?? 'America/New_York',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
