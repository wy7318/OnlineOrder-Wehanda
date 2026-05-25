import { NextResponse } from 'next/server'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

// Initiates the Stripe Connect OAuth flow.
// Redirects the browser to Stripe's authorization page.
export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))

  const clientId = process.env.STRIPE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!clientId) {
    return NextResponse.redirect(new URL('/setup?stripe_error=not_configured', appUrl))
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: `${appUrl}/api/stripe/connect/callback`,
    state: ctx.restaurantId,
  })

  return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params}`)
}
