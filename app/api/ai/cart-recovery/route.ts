import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { haikuJSON, PROMPTS, buildEmailHtml } from '@/lib/ai/haiku'
import { sendEmail } from '@/lib/email'
import { getEmailBaseUrl } from '@/lib/utils/app-url'

const COOLDOWN_DAYS = 7

export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { customer_id, cart_id } = body ?? {}
  if (!customer_id || !cart_id) {
    return NextResponse.json({ error: 'customer_id and cart_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString()

  // All lookups in parallel
  const [customerRes, cartRes, restaurantRes, recentRes] = await Promise.all([
    admin
      .from('customers')
      .select('id, first_name, last_name, name, email')
      .eq('id', customer_id)
      .eq('restaurant_id', ctx.restaurantId)
      .single(),

    admin
      .from('active_carts')
      .select('items')
      .eq('id', cart_id)
      .eq('restaurant_id', ctx.restaurantId)
      .single(),

    admin
      .from('restaurants')
      .select('name, slug')
      .eq('id', ctx.restaurantId)
      .single(),

    admin
      .from('ai_messages_log')
      .select('id')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('customer_id', customer_id)
      .eq('message_type', 'cart_recovery')
      .gte('sent_at', cooldownCutoff)
      .limit(1)
      .maybeSingle(),
  ])

  if (!customerRes.data?.email) {
    return NextResponse.json({ error: 'Customer has no email' }, { status: 422 })
  }
  if (recentRes.data) {
    return NextResponse.json({ already_sent: true })
  }

  const customer = customerRes.data
  const cart = cartRes.data
  const restaurant = restaurantRes.data!
  const customerName = customer.first_name
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    : customer.name

  const items = (Array.isArray(cart?.items) ? cart.items as { name?: string; quantity?: number }[] : [])
    .slice(0, 5)
    .map(i => ({ name: i.name ?? 'Item', quantity: i.quantity ?? 1 }))

  // Generate with Haiku
  const { subject, body: msgBody } = await haikuJSON<{ subject: string; body: string }>(
    PROMPTS.cartRecovery,
    JSON.stringify({ restaurant: restaurant.name, customer: customerName, cart_items: items }),
  )

  const itemSummary = items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')

  const html = buildEmailHtml({
    restaurantName: restaurant.name,
    customerName,
    body: msgBody,
    ctaLabel: 'Complete My Order',
    ctaUrl: `${getEmailBaseUrl()}/restaurant/${restaurant.slug}`,
    highlight: {
      emoji: '🛒',
      label: 'Still in your cart',
      value: `${items.length} item${items.length !== 1 ? 's' : ''}`,
      note: itemSummary || undefined,
      accentColor: '#ea580c',
      bgColor: '#fff7ed',
    },
  })

  await sendEmail({ to: customer.email, subject, html })

  // Log the send (fire-and-forget — don't block response)
  void admin.from('ai_messages_log').insert({
    restaurant_id: ctx.restaurantId,
    customer_id: customer.id,
    message_type: 'cart_recovery',
    channel: 'email',
    reference_id: cart_id,
    subject,
  })

  return NextResponse.json({ sent: true, subject })
}
