const fmt = (n: number) => `$${n.toFixed(2)}`

const ORDER_TYPE_LABEL: Record<string, string> = {
  pickup: 'Pickup',
  dine_in: 'Dine-In',
  delivery: 'Delivery',
}

export interface OrderEmailParams {
  restaurantName: string
  restaurantPhone: string | null
  restaurantAddress: string | null
  customerName: string
  orderNumber: string
  orderType: string
  subtotal: number
  taxAmount: number
  tipAmount: number
  totalAmount: number
  orderNotes: string | null
  deliveryAddress: string | null
  items: Array<{
    name: string
    quantity: number
    lineTotal: number
    options?: Array<{ groupName: string; optionName: string }>
    notes?: string | null
  }>
}

export function orderConfirmationEmail(p: OrderEmailParams): { subject: string; html: string } {
  const subject = `Order Confirmed – #${p.orderNumber} from ${p.restaurantName}`

  const itemRows = p.items.map(item => {
    const optionLines = (item.options ?? []).length > 0
      ? `<div style="margin-top:3px;padding-left:8px;border-left:2px solid #fed7aa;">${
          (item.options ?? []).map(o =>
            `<span style="display:block;font-size:12px;color:#9ca3af;">${o.groupName}: ${o.optionName}</span>`
          ).join('')
        }${item.notes ? `<span style="display:block;font-size:12px;color:#f97316;font-style:italic;">Note: ${item.notes}</span>` : ''}</div>`
      : item.notes
        ? `<div style="margin-top:3px;padding-left:8px;border-left:2px solid #fed7aa;"><span style="font-size:12px;color:#f97316;font-style:italic;">Note: ${item.notes}</span></div>`
        : ''

    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
          <div style="font-size:14px;font-weight:600;color:#111827;">${item.quantity}× ${item.name}</div>
          ${optionLines}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:top;font-size:14px;font-weight:600;color:#111827;white-space:nowrap;">
          ${fmt(item.lineTotal)}
        </td>
      </tr>`
  }).join('')

  const deliveryRow = p.orderType === 'delivery' && p.deliveryAddress
    ? `<tr>
        <td colspan="2" style="padding:12px 0 0;">
          <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Delivery address</p>
            <p style="margin:0;font-size:14px;color:#374151;">${p.deliveryAddress}</p>
          </div>
        </td>
      </tr>`
    : ''

  const notesRow = p.orderNotes
    ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;margin-top:16px;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;">Order notes</p>
        <p style="margin:0;font-size:14px;color:#78350f;">${p.orderNotes}</p>
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
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.1em;">${p.restaurantName}</p>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">Order Confirmed ✓</h1>
      <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">Order <strong>#${p.orderNumber}</strong> &nbsp;·&nbsp; ${ORDER_TYPE_LABEL[p.orderType] ?? p.orderType}</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">

      <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi <strong>${p.customerName}</strong>, your order has been received and the kitchen is preparing it now.</p>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #f3f4f6;">Item</th>
            <th style="text-align:right;padding-bottom:8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #f3f4f6;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${deliveryRow}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#6b7280;">Subtotal</td>
          <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${fmt(p.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#6b7280;">Tax</td>
          <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${fmt(p.taxAmount)}</td>
        </tr>
        ${p.tipAmount > 0 ? `
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#6b7280;">Tip</td>
          <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${fmt(p.tipAmount)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0 0;font-size:16px;font-weight:800;color:#111827;border-top:2px solid #f3f4f6;">Total</td>
          <td style="padding:10px 0 0;font-size:16px;font-weight:800;color:#f97316;text-align:right;border-top:2px solid #f3f4f6;">${fmt(p.totalAmount)}</td>
        </tr>
      </table>

      ${notesRow}

      <!-- Divider -->
      <div style="border-top:1px solid #f3f4f6;margin:24px 0;"></div>

      <!-- Contact -->
      <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151;">Questions about your order?</p>
        ${p.restaurantPhone ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;">📞 ${p.restaurantPhone}</p>` : ''}
        ${p.restaurantAddress ? `<p style="margin:0;font-size:13px;color:#6b7280;">📍 ${p.restaurantAddress}</p>` : ''}
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#9ca3af;">Powered by Wehanda · You received this because you placed an order.</p>
  </div>
</body>
</html>`

  return { subject, html }
}
