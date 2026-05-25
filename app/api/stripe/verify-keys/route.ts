import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

// Verifies that a secret key is valid by making a lightweight Stripe API call.
export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { secret_key } = await request.json()
  if (!secret_key?.startsWith('sk_')) {
    return NextResponse.json({ valid: false, error: 'Key must start with sk_' })
  }

  try {
    const stripe = new Stripe(secret_key)
    await stripe.balance.retrieve()
    return NextResponse.json({ valid: true })
  } catch (err: unknown) {
    const msg = err instanceof Stripe.errors.StripeAuthenticationError
      ? 'Invalid API key'
      : 'Could not connect to Stripe'
    return NextResponse.json({ valid: false, error: msg })
  }
}
