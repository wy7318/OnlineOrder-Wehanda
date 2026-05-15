import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTimeSlots } from '@/lib/utils/slots'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const date = searchParams.get('date')
  const partySize = parseInt(searchParams.get('party_size') ?? '1')

  if (!restaurantId || !date) {
    return NextResponse.json({ error: 'restaurant_id and date required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const [{ data: restaurant }, { data: hours }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('reservation_capacity, reservation_max_party_size, reservation_min_notice_hours, reservations_enabled, timezone')
      .eq('id', restaurantId)
      .single(),
    supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', restaurantId),
  ])

  if (!restaurant || !restaurant.reservations_enabled) {
    return NextResponse.json({ slots: [], capacity: 0, maxPartySize: 0 })
  }

  const allSlots = generateTimeSlots(hours ?? [], date)

  const { data: existing } = await supabase
    .from('reservations')
    .select('reservation_time, party_size')
    .eq('restaurant_id', restaurantId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed'])

  const occupancy: Record<string, number> = {}
  for (const r of existing ?? []) {
    const t = String(r.reservation_time).substring(0, 5)
    occupancy[t] = (occupancy[t] ?? 0) + r.party_size
  }

  // Compute current time in restaurant's timezone for min-notice filtering
  const now = new Date()
  const tz = restaurant.timezone ?? 'America/New_York'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  const tzDateStr = `${get('year')}-${get('month')}-${get('day')}`
  const tzCurrentMinutes = parseInt(get('hour')) * 60 + parseInt(get('minute'))
  const minNoticeMinutes = (restaurant.reservation_min_notice_hours ?? 1) * 60
  const capacity = restaurant.reservation_capacity ?? 20

  const slots = allSlots.map(time => {
    const occupied = occupancy[time] ?? 0
    const remaining = capacity - occupied
    const [slotH, slotM] = time.split(':').map(Number)
    const slotMinutes = slotH * 60 + slotM
    const isPast =
      date < tzDateStr ||
      (date === tzDateStr && slotMinutes <= tzCurrentMinutes + minNoticeMinutes)

    return {
      time,
      remaining,
      available: !isPast && remaining >= partySize,
      isPast,
    }
  })

  return NextResponse.json({ slots, capacity, maxPartySize: restaurant.reservation_max_party_size ?? 10 })
}
