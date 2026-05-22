import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { reservationConfirmedEmail } from '@/lib/email/reservationConfirmed'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, internal_notes } = body

    const validStatuses = ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined) updates.status = status
    if (internal_notes !== undefined) updates.internal_notes = internal_notes || null

    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send confirmation email when owner marks as confirmed
    if (status === 'confirmed' && data.customer_email) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, phone, address')
        .eq('id', data.restaurant_id)
        .single()

      if (restaurant) {
        const { subject, html } = reservationConfirmedEmail({
          restaurantName: restaurant.name,
          restaurantPhone: restaurant.phone ?? null,
          restaurantAddress: restaurant.address ?? null,
          customerName: data.customer_name,
          partySize: data.party_size,
          reservationDate: data.reservation_date,
          reservationTime: data.reservation_time,
          notes: data.notes ?? null,
          reservationId: data.id,
        })
        sendEmail({ to: data.customer_email, subject, html }).catch(() => {})
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Reservation PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
