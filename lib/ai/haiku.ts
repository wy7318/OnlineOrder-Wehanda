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

  // Sent on customer's birthday (or a day or two before)
  birthday: `You write short, warm birthday emails from a restaurant owner to a customer.
Make it feel like a genuine birthday message from a friend, not a marketing email.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, warm and personal (e.g. "Happy Birthday, Sarah! 🎂")
- body: 2-3 sentences, plain text only, no HTML tags
- Mention their name and wish them a wonderful birthday
- If they have a usual order, give it a warm mention
- If they have birthday bonus points, mention it as a gift from the restaurant
- Sound genuine, never automated
- Never use words like: "campaign", "offer", "promotion", "redeem", "conversion"`,

  // Sent 3 days after an order to invite them back
  afterOrder: `You write short, friendly follow-up emails from a restaurant owner sent a few days after a customer's meal.
Write like a restaurant owner who genuinely cares that the customer enjoyed their food.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, friendly (e.g. "Hope you enjoyed your meal!")
- body: 2 sentences max, plain text only, no HTML tags
- Reference what they ordered so it feels personal
- Keep it light — no pressure, just a warm check-in and gentle invitation to come back
- Never use words like: "feedback loop", "re-engage", "retention", "follow-up campaign"`,

  // Sent to customers in same category when a new item launches (one template, all recipients)
  newItemLaunch: `You write short, exciting emails from a restaurant owner announcing a brand-new menu item.
Write like you're texting your regulars about something you're genuinely proud of.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, exciting and item-specific (e.g. "Just added: Truffle Pasta 🍝" or "Something new you'll love is on the menu ✨")
- body: 2-3 sentences, plain text only, no HTML tags — do NOT include a greeting or customer name
- Name the item and describe it using the description provided — make it sound delicious and specific
- End with a simple, warm invitation to try it
- The body will be sent to many people, so keep it warm but not addressed to any individual
- Never use words like: "launch", "campaign", "promotion", "CTR", "new menu item rollout", "dear customer"`,

  // Sent during a slow day to bring customers in
  quietDay: `You write short, friendly emails from a restaurant owner on a slow day.
Write like you're reaching out to a regular and letting them know it's a great time to come in.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, casual and inviting (e.g. "Come in today — it's a perfect time 🍽️")
- body: 2 sentences max, plain text only, no HTML tags
- Keep it casual — don't mention revenue targets or slow days explicitly
- Optionally mention a special item or reason it's a nice time to visit
- Never use words like: "slow day", "revenue target", "boost sales", "promotion", "incentive"`,

  // Sent when customer hits a milestone order count (5th, 10th, 25th)
  milestone: `You write short, celebratory emails from a restaurant owner when a customer hits a milestone.
Make the customer feel like a true regular and valued guest.
Return JSON only: {"subject":"…","body":"…"}
Rules:
- subject: max 55 chars, celebratory (e.g. "You're officially one of our regulars! 🎉")
- body: 2-3 sentences, plain text only, no HTML tags
- Mention the milestone number (5th, 10th, 25th order) warmly
- Make them feel special and appreciated — not like a statistic
- If there's a bonus reward, mention it as a genuine thank-you gift
- Never use words like: "loyalty metric", "milestone achievement", "customer retention", "engagement"`,
}

// Optional highlight card shown between greeting and body text.
// Each email type passes its own relevant data here.
export interface EmailHighlight {
  emoji: string
  label: string   // small caps label above the value
  value: string   // large prominent value
  note?: string   // optional small line below value
  accentColor: string  // hex — used for value text and card border
  bgColor: string      // hex — card background
}

// Email HTML wrapper — uses table-based layout for email client compatibility.
// Haiku writes the body text; this wraps it in a polished, branded shell.
export function buildEmailHtml({
  restaurantName,
  customerName,
  body,
  ctaLabel,
  ctaUrl,
  highlight,
}: {
  restaurantName: string
  customerName: string
  body: string
  ctaLabel: string
  ctaUrl: string
  highlight?: EmailHighlight
}): string {
  const bodyParagraphs = body
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p style="margin:0 0 14px 0;font-size:15px;color:#374151;line-height:1.7">${l}</p>`)
    .join('')

  const highlightHtml = highlight ? `
    <tr>
      <td style="padding:0 32px 24px 32px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${highlight.bgColor};border-radius:14px;border-left:4px solid ${highlight.accentColor}">
          <tr>
            <td style="padding:18px 20px">
              <p style="margin:0;font-size:30px;line-height:1">${highlight.emoji}</p>
              <p style="margin:8px 0 2px 0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px">${highlight.label}</p>
              <p style="margin:0;font-size:28px;font-weight:800;color:${highlight.accentColor};letter-spacing:-0.5px">${highlight.value}</p>
              ${highlight.note ? `<p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af">${highlight.note}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${restaurantName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Header gradient -->
                <tr>
                  <td style="background:linear-gradient(135deg,#037FFC 0%,#0255c4 100%);padding:28px 32px">
                    <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px">${restaurantName}</p>
                    <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.65);font-size:13px">A message just for you</p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:28px 32px 20px 32px">
                    <p style="margin:0;font-size:17px;font-weight:600;color:#111827">Hi ${customerName} 👋</p>
                  </td>
                </tr>

                <!-- Highlight card (optional, per email type) -->
                ${highlightHtml}

                <!-- Body text -->
                <tr>
                  <td style="padding:0 32px 8px 32px">
                    ${bodyParagraphs}
                  </td>
                </tr>

                <!-- CTA button -->
                <tr>
                  <td style="padding:16px 32px 32px 32px">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#037FFC;border-radius:12px">
                          <a href="${ctaUrl}"
                             style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.1px">
                            ${ctaLabel} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding:0 32px"><hr style="border:none;border-top:1px solid #f3f4f6;margin:0"></td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:18px 32px;background:#fafafa;border-radius:0 0 20px 20px">
                    <p style="margin:0;font-size:12px;color:#9ca3af">
                      Sent by <strong style="color:#6b7280">${restaurantName}</strong> via Wehanda &nbsp;·&nbsp;
                      You're receiving this as a valued customer.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Bottom spacer / branding -->
          <tr>
            <td align="center" style="padding:20px 0 8px 0">
              <p style="margin:0;font-size:11px;color:#94a3b8">Powered by Wehanda</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
