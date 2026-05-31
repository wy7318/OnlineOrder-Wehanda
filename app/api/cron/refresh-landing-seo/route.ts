import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { haikuJSON } from '@/lib/ai/haiku'
import { revalidatePath } from 'next/cache'
import { verifyCronSecret } from '@/lib/ai/campaigns'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are an expert SEO copywriter for B2B SaaS products targeting the restaurant industry.
Generate fresh landing page SEO content for "Wehanda" — a restaurant online ordering and AI marketing platform.
Platform: online ordering (pickup/dine-in/delivery), menu builder, reservations, customer CRM, loyalty program, 8 website templates — Basic $69/month. Revenue Boost $149/month adds 8 AI email campaign types, customer scoring, menu insights, upsell engine, push notifications, competitor research.
Target search intent: "restaurant online ordering software", "restaurant ordering system", "restaurant marketing automation", "online food ordering platform".
Return JSON only — no markdown:
{
  "meta_title": "string (55-60 chars — brand + main value prop, must include 'restaurant')",
  "meta_description": "string (140-155 chars — key features + $69/month pricing + CTA)",
  "keywords": "string (12-15 comma-separated: feature + 'for restaurants' combos, price signals, near-me variants)",
  "hero_headline": "string (max 60 chars — punchy, value-specific, not the brand name alone)",
  "hero_subheadline": "string (max 140 chars — concrete benefits + starting price)"
}
Rules:
- Vary copy with current month/season (seasonal hooks: summer patios, holiday rush, new year fresh start, Valentine's Day, etc.)
- Use specific numbers: $69/month, $149/month, 8 AI campaigns, 8 templates
- Never: "culinary journey", "transform your business", "all-in-one solution", "seamless experience"
- Keywords must include: "restaurant online ordering software", "[feature] for restaurants", "restaurant SaaS"
- Hero headline must be direct and benefit-led, not aspirational fluff`

interface SeoPayload {
  meta_title: string
  meta_description: string
  keywords: string
  hero_headline: string
  hero_subheadline: string
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const seo = await haikuJSON<SeoPayload>(
    SYSTEM_PROMPT,
    `Current month: ${month}. Generate fresh, seasonally-aware SEO copy for the Wehanda landing page.`,
    500,
  )

  const admin = createAdminClient()
  await admin
    .from('platform_seo')
    .upsert({ id: 1, ...seo, updated_at: new Date().toISOString() })

  revalidatePath('/')

  return NextResponse.json({ ok: true, updated: seo.meta_title, month })
}
