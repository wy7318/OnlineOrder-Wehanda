import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// Single call to Haiku. Expects the model to return valid JSON — caller must parse.
export async function haikuJSON<T>(
  system: string,
  user: string,
  maxTokens = 600,
): Promise<T> {
  const msg = await client().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected Haiku response type')
  const text = block.text.trim()
  // Strip markdown code fences if model wraps output
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(clean) as T
}

// Prompts ─────────────────────────────────────────────────────────────────────

export const PROMPTS = {
  // Sent to customers who added items to their cart but didn't order
  cartRecovery: `You write short, casual emails from a restaurant owner to a customer who left food in their cart.
Write like a real person texting a regular customer — friendly, zero sales pressure.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, natural (e.g. "You left something behind 🛒")
- body: 2 sentences max, plain text only, no HTML tags
- Mention the actual items by name so it feels personal
- End with one simple instruction like "just tap below to finish your order"
- Never use words like: "conversion", "cart abandonment", "re-engage", "campaign"`,

  // Sent to customers who haven't been back in a while
  winBack: `You write short, warm emails from a restaurant owner to a customer they miss seeing.
Write like a friend reaching out, not a marketing department.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, personal (e.g. "We miss you, Sarah!")
- body: 2 sentences max, plain text only, no HTML tags
- If they have loyalty points, mention it as a bonus waiting for them
- Sound genuine, not automated
- Never use words like: "win-back", "churn", "re-engage", "lapsed customer", "campaign"`,

  // Sent to loyalty members who are close to or can already use their reward
  loyaltyNudge: `You write short, upbeat emails from a restaurant to a loyalty member about their reward points.
Make it feel like exciting news, not a reminder notice.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, celebratory (e.g. "Your reward is almost ready! 🎉")
- body: 2 sentences max, plain text only, no HTML tags
- If they can already redeem: focus on the reward they can claim right now
- If they're close: tell them exactly how many more points they need, make it feel achievable
- Never use words like: "redemption threshold", "loyalty program engagement", "points_to_redeem"`,

  // Tips for the owner about menu items people look at but don't order
  menuInsights: `You are a helpful restaurant advisor giving plain-English tips to a restaurant owner.
For each menu item that many people look at but few actually order, give one simple, practical tip.
Write like you're giving advice to a friend who owns a restaurant — no jargon, no fancy terms.
Return a JSON array: [{"id":"…","tip":"…"}]
Rules:
- Each tip: 1-2 sentences, plain English
- Focus on things they can fix today: update the photo, rewrite the description, tweak the price, move it on the menu
- Be specific and direct — say exactly what to do, not just "consider improving"
- Never use words like: "conversion rate", "CTR", "optimize", "leverage", "monetize"
Only return the JSON array, nothing else.`,
}

// Email HTML wrapper — Haiku writes the body text, this wraps it
export function buildEmailHtml({
  restaurantName,
  customerName,
  body,
  ctaLabel,
  ctaUrl,
}: {
  restaurantName: string
  customerName: string
  body: string
  ctaLabel: string
  ctaUrl: string
}): string {
  const escapedBody = body
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p style="margin:0 0 14px 0;line-height:1.6">${l}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
    <div style="background:#037FFC;padding:24px 28px">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:700">${restaurantName}</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 20px 0;font-size:15px;color:#374151">Hi ${customerName},</p>
      <div style="font-size:15px;color:#374151">${escapedBody}</div>
      <a href="${ctaUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#037FFC;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">${ctaLabel}</a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">Sent by ${restaurantName} via Wehanda.</p>
    </div>
  </div>
</body>
</html>`
}
