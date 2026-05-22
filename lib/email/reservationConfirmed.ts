function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(t: string): string {
  const [h, min] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${min.toString().padStart(2, '0')} ${period}`
}

export interface ReservationConfirmedEmailParams {
  restaurantName: string
  restaurantPhone: string | null
  restaurantAddress: string | null
  customerName: string
  partySize: number
  reservationDate: string
  reservationTime: string
  notes: string | null
  reservationId: string
}

export function reservationConfirmedEmail(p: ReservationConfirmedEmailParams): { subject: string; html: string } {
  const formattedDate = formatDate(p.reservationDate)
  const formattedTime = formatTime(p.reservationTime)
  const subject = `Reservation Confirmed – ${formattedDate} at ${p.restaurantName}`
  const shortRef = p.reservationId.slice(0, 8).toUpperCase()

  const notesRow = p.notes
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-top:4px;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;">Your notes</p>
        <p style="margin:0;font-size:14px;color:#15803d;">${p.notes}</p>
      </div>`
    : ''

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
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.1em;">${p.restaurantName}</p>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">Reservation Confirmed ✓</h1>
      <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">We look forward to seeing you!</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">

      <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi <strong>${p.customerName}</strong>, your reservation has been confirmed. Here are your booking details:</p>

      <!-- Details card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:#15803d;padding:10px 16px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.08em;">Booking Details</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:14px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;width:40%;border-bottom:1px solid #e2e8f0;">Date</td>
            <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;border-bottom:1px solid #e2e8f0;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;">Time</td>
            <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;border-bottom:1px solid #e2e8f0;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;">Party Size</td>
            <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;border-bottom:1px solid #e2e8f0;">${p.partySize} ${p.partySize === 1 ? 'guest' : 'guests'}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Status</td>
            <td style="padding:14px 16px;">
              <span style="display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">Confirmed</span>
            </td>
          </tr>
        </table>
      </div>

      ${notesRow}

      <!-- Reference -->
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Reference: <strong style="color:#6b7280;">${shortRef}</strong></p>

      <!-- Divider -->
      <div style="border-top:1px solid #f3f4f6;margin:20px 0;"></div>

      <!-- Need to cancel? -->
      <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151;">Need to cancel or modify?</p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Please contact us as soon as possible:</p>
        ${p.restaurantPhone ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;">📞 ${p.restaurantPhone}</p>` : ''}
        ${p.restaurantAddress ? `<p style="margin:0;font-size:13px;color:#6b7280;">📍 ${p.restaurantAddress}</p>` : ''}
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#9ca3af;">Powered by Wehanda · You received this because you made a reservation.</p>
  </div>
</body>
</html>`

  return { subject, html }
}
