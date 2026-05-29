/**
 * Returns the base URL to use in outgoing emails.
 *
 * Rules:
 * - On Vercel (any env): use NEXT_PUBLIC_APP_URL from Vercel env vars, which
 *   should be set to the production domain. Falls back to VERCEL_URL (the
 *   deployment-specific URL Vercel injects automatically).
 * - Local dev: always use the hardcoded production URL so customers can
 *   actually click the link. The ngrok tunnel is not guaranteed to be alive.
 */
export function getEmailBaseUrl(): string {
  // VERCEL_ENV is automatically injected by Vercel ('production' | 'preview' | 'development')
  // It is never present when running locally via `next dev`
  if (process.env.VERCEL_ENV) {
    return (
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://online-order-wehanda.vercel.app')
    )
  }

  // Local development — emails must still reach real customers on the live site
  return 'https://online-order-wehanda.vercel.app'
}
