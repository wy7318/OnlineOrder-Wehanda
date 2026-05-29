import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmailBaseUrl } from '@/lib/utils/app-url'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token) return NextResponse.redirect(`${getEmailBaseUrl()}/`)

  const admin = createAdminClient()

  const { data: contact } = await admin
    .from('campaign_contacts')
    .select('id, campaign_id, status, restaurants!inner(slug)')
    .eq('click_token', token)
    .maybeSingle()

  if (!contact) return NextResponse.redirect(`${getEmailBaseUrl()}/`)

  // Mark clicked once — only transition from 'sent' to 'clicked'
  if (contact.status === 'sent') {
    const now = new Date().toISOString()

    // Update contact status
    await admin
      .from('campaign_contacts')
      .update({ status: 'clicked', clicked_at: now })
      .eq('id', contact.id as string)

    // Increment campaign click_count by recomputing from contacts (accurate, avoids race conditions)
    const { count } = await admin
      .from('campaign_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', contact.campaign_id as string)
      .in('status', ['clicked', 'converted'])

    void admin
      .from('campaigns')
      .update({ click_count: (count ?? 0) + 1, updated_at: now })
      .eq('id', contact.campaign_id as string)
  }

  // Redirect to restaurant page — attribution cron links orders placed after click
  const slug = (contact.restaurants as { slug?: string } | null)?.slug
  const base = getEmailBaseUrl()
  if (slug) return NextResponse.redirect(`${base}/restaurant/${slug}`)

  return NextResponse.redirect(base)
}
