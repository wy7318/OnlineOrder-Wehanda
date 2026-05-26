export function trialExpiryWarningEmail({
  restaurantName,
  daysLeft,
  trialEndsOn,
}: {
  restaurantName: string
  daysLeft: number
  trialEndsOn: string  // e.g. "June 1, 2026"
}): { subject: string; html: string } {
  const subject = `⚠️ Your Wehanda trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — ${restaurantName}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1f2937,#111827);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.12em;">Wehanda Platform</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">${restaurantName}</h1>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">

    <!-- Warning badge -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;gap:14px;align-items:flex-start;">
      <span style="font-size:24px;line-height:1;">⚠️</span>
      <div>
        <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#92400e;">Trial ending in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</p>
        <p style="margin:0;font-size:13px;color:#78350f;">Your free trial expires on <strong>${trialEndsOn}</strong>. After that date, access to your dashboard will be paused.</p>
      </div>
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Hi there,<br><br>
      This is a reminder that your <strong>Wehanda trial for ${restaurantName}</strong> is coming to an end.
      To continue using the platform without interruption, please reach out to our support team before your trial expires.
    </p>

    <!-- What's at stake -->
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">What you'll keep with a full license</p>
      ${[
        ['📋', 'Orders', 'Receive and manage online orders in real time'],
        ['🍽', 'Menu Builder', 'Full control of your menu, availability, and pricing'],
        ['📅', 'Reservations', 'Table reservations and guest management'],
        ['👥', 'Customers & CRM', 'Customer history, loyalty programs, and CRM tools'],
        ['📊', 'Analytics', 'Monthly performance reports and sales insights'],
      ].map(([icon, title, desc]) => `
      <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:16px;width:24px;text-align:center;flex-shrink:0;">${icon}</span>
        <div>
          <p style="margin:0;font-size:13px;font-weight:700;color:#111827;">${title}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${desc}</p>
        </div>
      </div>`).join('')}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="mailto:support@simplidone.com?subject=License%20renewal%20-%20${encodeURIComponent(restaurantName)}"
        style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Contact Support to Renew
      </a>
      <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
        Or email us at <a href="mailto:support@simplidone.com" style="color:#f97316;">support@simplidone.com</a>
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;">
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
      You're receiving this because you are the owner of <strong>${restaurantName}</strong> on Wehanda.<br>
      Trial expires: <strong>${trialEndsOn}</strong>
    </p>
  </div>

  <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#9ca3af;">
    Powered by Wehanda
  </p>
</div>
</body>
</html>`

  return { subject, html }
}
