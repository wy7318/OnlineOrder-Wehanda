import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { owner_user_id, is_active } = body

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (owner_user_id !== undefined) update.owner_user_id = owner_user_id
  if (is_active !== undefined) update.is_active = is_active

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurants')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('restaurants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
