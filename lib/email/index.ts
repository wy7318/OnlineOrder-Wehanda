import { Resend } from 'resend'

const FROM = 'Wehanda <noreply@updates.simplidone.com>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to)
    return
  }
  const resend = new Resend(key)
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) console.error('[email] send failed:', error)
}
