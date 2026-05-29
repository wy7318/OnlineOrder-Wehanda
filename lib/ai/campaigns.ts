import { createAdminClient } from '@/lib/supabase/admin'
import { haikuJSON, PROMPTS, buildEmailHtml } from '@/lib/ai/haiku'
import { sendEmail } from '@/lib/email'
import { getEmailBaseUrl } from '@/lib/utils/app-url'
import type { EmailHighlight } from '@/lib/ai/haiku'

export type CampaignType =
  | 'birthday' | 'after_order' | 'new_item_launch'
  | 'quiet_day' | 'milestone' | 'win_back' | 'cart_recovery' | 'loyalty_nudge'

interface SendCampaignEmailParams {
  campaignId: string
  restaurantId: string
  customerId: string
  customerEmail: string
  restaurantName: string
  restaurantSlug: string
  customerName: string
  promptKey: keyof typeof PROMPTS
  promptContext: object
  ctaLabel: string
  highlight?: EmailHighlight
}

/** Build the click-tracked CTA URL for a campaign contact click_token. */
export function buildTrackedUrl(clickToken: string): string {
  return `${getEmailBaseUrl()}/api/track/r/${clickToken}`
}

/** Create a campaign record for a batch send. Returns campaign id. */
export async function createCampaign({
  restaurantId,
  campaignType,
  name,
  metadata = {},
}: {
  restaurantId: string
  campaignType: CampaignType
  name: string
  metadata?: object
}): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('campaigns')
    .insert({ restaurant_id: restaurantId, campaign_type: campaignType, name, metadata })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create campaign: ${error?.message}`)
  return data.id as string
}

/**
 * Generate an AI email, send it, and record a campaign_contact row.
 * Returns the subject line and click_token on success.
 */
export async function sendCampaignEmail({
  campaignId,
  restaurantId,
  customerId,
  customerEmail,
  restaurantName,
  restaurantSlug,
  customerName,
  promptKey,
  promptContext,
  ctaLabel,
  highlight,
}: SendCampaignEmailParams): Promise<{ subject: string; clickToken: string }> {
  const admin = createAdminClient()

  // Pre-insert the contact to get the click_token before generating email
  const { data: contact, error: contactErr } = await admin
    .from('campaign_contacts')
    .insert({
      campaign_id: campaignId,
      restaurant_id: restaurantId,
      customer_id: customerId,
      status: 'pending',
      sent_at: new Date().toISOString(),
    })
    .select('id, click_token')
    .single()

  if (contactErr || !contact) throw new Error(`Failed to create contact: ${contactErr?.message}`)

  const clickToken = contact.click_token as string

  const { subject, body: msgBody } = await haikuJSON<{ subject: string; body: string }>(
    PROMPTS[promptKey],
    JSON.stringify(promptContext),
  )

  const html = buildEmailHtml({
    restaurantName,
    customerName,
    body: msgBody,
    ctaLabel,
    ctaUrl: buildTrackedUrl(clickToken),
    highlight,
  })

  await sendEmail({ to: customerEmail, subject, html })

  void admin
    .from('campaign_contacts')
    .update({ status: 'sent', subject })
    .eq('id', contact.id as string)

  void restaurantSlug // used by caller for non-tracked fallback links if needed

  return { subject, clickToken }
}

/** After all sends, update campaign with final sent count. */
export async function finalizeCampaign(campaignId: string, sentCount: number): Promise<void> {
  const admin = createAdminClient()
  void admin
    .from('campaigns')
    .update({ sent_count: sentCount, status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', campaignId)
}

/** Check if a customer received a given campaign type within `withinDays` days. */
export async function alreadySentCampaign({
  restaurantId,
  customerId,
  campaignType,
  withinDays,
}: {
  restaurantId: string
  customerId: string
  campaignType: CampaignType
  withinDays: number
}): Promise<boolean> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - withinDays * 86_400_000).toISOString()
  const { data } = await admin
    .from('campaign_contacts')
    .select('id, campaigns!inner(campaign_type)')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .gte('sent_at', since)
    .eq('campaigns.campaign_type', campaignType)
    .limit(1)
    .maybeSingle()
  return !!data
}

/** Load automation settings for a restaurant (defaults to all enabled if not set). */
export async function getAutomationSettings(restaurantId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('campaign_automation_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  return {
    birthday_enabled: data?.birthday_enabled ?? true,
    after_order_enabled: data?.after_order_enabled ?? true,
    quiet_day_enabled: data?.quiet_day_enabled ?? true,
    milestone_enabled: data?.milestone_enabled ?? true,
    new_item_enabled: data?.new_item_enabled ?? true,
  }
}

/** Verify Vercel cron secret. Call at top of every cron handler. */
export function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}
