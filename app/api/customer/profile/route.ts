import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('customer_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data ?? null)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name, phone } = await request.json()
  if (!display_name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Ensure a user_profiles row exists with role=customer.
  // ignoreDuplicates prevents overwriting an existing restaurant owner's role.
  await admin.from('user_profiles').upsert(
    { id: user.id, email: user.email!, role: 'customer' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data, error } = await admin
    .from('customer_profiles')
    .upsert(
      { id: user.id, display_name: display_name.trim(), phone: phone.trim() },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Claim any unlinked guest records matching this phone and sync the name
  await admin.from('customers')
    .update({ name: display_name.trim(), phone: phone.trim(), auth_user_id: user.id })
    .eq('phone', phone.trim())
    .is('auth_user_id', null)

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const update: Record<string, string> = {}
  if (body.display_name) update.display_name = body.display_name.trim()
  if (body.phone) update.phone = body.phone.trim()

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Capture old phone before applying update — needed to claim guest records
  const { data: currentProfile } = await admin
    .from('customer_profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle()

  const { data, error } = await admin
    .from('customer_profiles')
    .update(update)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const crmUpdate: Record<string, string> = {}
  if (update.display_name) crmUpdate.name = update.display_name
  if (update.phone) crmUpdate.phone = update.phone

  if (Object.keys(crmUpdate).length > 0) {
    // Update records already linked by auth_user_id (logged-in orders/reservations)
    await admin.from('customers').update(crmUpdate).eq('auth_user_id', user.id)

    // Also claim unlinked guest records matching the old phone and sync them.
    // Covers accounts created before auth_user_id was linked (guest → logged-in).
    const oldPhone = currentProfile?.phone
    if (oldPhone) {
      await admin.from('customers')
        .update({ ...crmUpdate, auth_user_id: user.id })
        .eq('phone', oldPhone)
        .is('auth_user_id', null)
    }
  }

  return NextResponse.json(data)
}
