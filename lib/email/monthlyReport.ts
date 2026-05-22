import type { MonthlyReportData } from '@/lib/reports/monthlyData'

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtInt = (n: number) => n.toLocaleString('en-US')

function changeBadge(pct: number | null, invert = false): string {
  if (pct === null) return '<span style="color:#9ca3af;font-size:12px;">—</span>'
  const positive = invert ? pct < 0 : pct > 0
  const color = positive ? '#16a34a' : pct === 0 ? '#6b7280' : '#dc2626'
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  return `<span style="color:${color};font-weight:700;font-size:12px;">${arrow} ${Math.abs(pct)}%</span>`
}

function sectionHeader(title: string, emoji: string): string {
  return `
  <tr>
    <td colspan="4" style="padding:24px 0 10px;">
      <div style="background:#f8fafc;border-left:3px solid #f97316;padding:10px 14px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:0.05em;">${emoji} ${title}</p>
      </div>
    </td>
  </tr>`
}

export function monthlyReportEmail(d: MonthlyReportData): { subject: string; html: string } {
  const subject = `📊 ${d.periodLabel} Monthly Report — ${d.restaurantName}`

  // ── Summary snapshot rows ──────────────────────────────────
  const summaryRows = [
    {
      label: 'Total Orders',
      current: fmtInt(d.orders.current),
      prev: fmtInt(d.orders.prev),
      change: changeBadge(d.orders.changePct),
    },
    {
      label: 'Gross Revenue',
      current: fmt(d.revenue.current),
      prev: fmt(d.revenue.prev),
      change: changeBadge(d.revenue.changePct),
    },
    {
      label: 'Avg. Order Value',
      current: fmt(d.revenue.aovCurrent),
      prev: fmt(d.revenue.aovPrev),
      change: changeBadge(d.revenue.aovChangePct),
    },
    {
      label: 'New Customers',
      current: fmtInt(d.customers.newCount),
      prev: '—',
      change: '—',
    },
    {
      label: 'Cancellation Rate',
      current: `${d.orders.cancellationRatePct}%`,
      prev: '—',
      change: d.orders.cancelledCount > 0
        ? `<span style="color:#dc2626;font-size:12px;">${d.orders.cancelledCount} orders · ${fmt(d.orders.cancelledRevenueLost)} lost</span>`
        : '<span style="color:#16a34a;font-size:12px;">✓ None</span>',
    },
  ].map(row => `
    <tr>
      <td style="padding:10px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${row.label}</td>
      <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;">${row.current}</td>
      <td style="padding:10px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${row.prev}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${row.change}</td>
    </tr>`).join('')

  // ── Peak days ──────────────────────────────────────────────
  const maxDayCount = d.peakDays[0]?.count || 1
  const peakDayRows = d.peakDays.map(day => {
    const barWidth = Math.round((day.count / maxDayCount) * 100)
    const isBusiest = day.count === maxDayCount && day.count > 0
    return `
    <tr>
      <td style="padding:6px 12px;font-size:13px;color:#374151;white-space:nowrap;width:90px;border-bottom:1px solid #f9fafb;">${day.day}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f9fafb;">
        <div style="background:#f3f4f6;border-radius:4px;height:10px;width:100%;max-width:180px;">
          <div style="background:${isBusiest ? '#f97316' : '#fbd5a5'};border-radius:4px;height:10px;width:${barWidth}%;"></div>
        </div>
      </td>
      <td style="padding:6px 12px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f9fafb;white-space:nowrap;">${fmtInt(day.count)} orders</td>
      <td style="padding:6px 12px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f9fafb;white-space:nowrap;">${fmt(day.revenue)}</td>
    </tr>`
  }).join('')

  // ── Peak hours ─────────────────────────────────────────────
  const peakHoursList = d.peakHours.map((h, i) =>
    `<span style="display:inline-block;background:${i === 0 ? '#fff7ed' : '#f9fafb'};border:1px solid ${i === 0 ? '#fed7aa' : '#e5e7eb'};color:${i === 0 ? '#c2410c' : '#374151'};border-radius:20px;padding:4px 12px;font-size:13px;font-weight:${i === 0 ? '700' : '500'};margin:2px;">${h.hour} <span style="color:#9ca3af;">(${h.count})</span></span>`
  ).join(' ')

  // ── Top items ──────────────────────────────────────────────
  const topItemRows = d.topItems.length > 0
    ? d.topItems.map((item, i) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f9fafb;">${i + 1}</td>
      <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #f9fafb;">${item.name}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f9fafb;">${fmtInt(item.qty)} sold</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#f97316;text-align:right;border-bottom:1px solid #f9fafb;">${fmt(item.revenue)}</td>
    </tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;font-size:13px;color:#9ca3af;text-align:center;">No item data this month</td></tr>'

  // ── Bottom items ───────────────────────────────────────────
  const bottomItemRows = d.bottomItems.length > 0
    ? d.bottomItems.map((item, i) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f9fafb;">${i + 1}</td>
      <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f9fafb;">${item.name}</td>
      <td style="padding:8px 12px;font-size:13px;color:#9ca3af;text-align:right;border-bottom:1px solid #f9fafb;">${fmtInt(item.qty)} sold</td>
      <td style="padding:8px 12px;font-size:13px;color:#9ca3af;text-align:right;border-bottom:1px solid #f9fafb;">${fmt(item.revenue)}</td>
    </tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;font-size:13px;color:#9ca3af;text-align:center;">No item data this month</td></tr>'

  // ── Top revenue items ──────────────────────────────────────
  const topRevenueRows = d.topRevenueItems.map((item, i) => `
    <tr>
      <td style="padding:7px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f9fafb;">${i + 1}</td>
      <td style="padding:7px 12px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #f9fafb;">${item.name}</td>
      <td style="padding:7px 12px;font-size:13px;font-weight:700;color:#16a34a;text-align:right;border-bottom:1px solid #f9fafb;">${fmt(item.revenue)}</td>
    </tr>`).join('')

  // ── Reservations section ───────────────────────────────────
  const reservationsSection = d.reservations ? `
    <table style="width:100%;border-collapse:collapse;">
      ${sectionHeader('Reservations', '🗓')}
      <tr>
        <td colspan="4" style="padding:4px 0 12px;">
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:12px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#4f46e5;">${fmtInt(d.reservations.current)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Total ${changeBadge(d.reservations.changePct)}</p>
              </td>
              <td style="padding:12px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:22px;font-weight:800;color:${d.reservations.noShowRatePct > 10 ? '#dc2626' : '#16a34a'};">${d.reservations.noShowRatePct}%</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">No-show Rate</p>
              </td>
              <td style="padding:12px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#0284c7;">${d.reservations.avgPartySize}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Avg. Party Size</p>
              </td>
              <td style="padding:12px 16px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#dc2626;">${fmtInt(d.reservations.noShowCount)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">No-shows</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${d.reservations.busiestSlots.length > 0 ? `
      <tr>
        <td colspan="4" style="padding:0 0 16px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Busiest Slots</p>
          <div>${d.reservations.busiestSlots.map((s, i) =>
            `<span style="display:inline-block;background:${i === 0 ? '#eef2ff' : '#f9fafb'};border:1px solid ${i === 0 ? '#c7d2fe' : '#e5e7eb'};color:${i === 0 ? '#4338ca' : '#374151'};border-radius:20px;padding:4px 12px;font-size:13px;font-weight:${i === 0 ? '700' : '500'};margin:2px;">${s.label} <span style="color:#9ca3af;">(${s.count})</span></span>`
          ).join(' ')}</div>
        </td>
      </tr>` : ''}
    </table>` : ''

  // ── Insights ───────────────────────────────────────────────
  const insightsSection = d.insights.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;">
      ${sectionHeader('Actionable Insights', '💡')}
      <tr>
        <td colspan="4" style="padding:0 0 8px;">
          ${d.insights.map(tip => `
          <div style="display:flex;gap:10px;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:8px;">
            <span style="font-size:18px;line-height:1;">💡</span>
            <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5;">${tip}</p>
          </div>`).join('')}
        </td>
      </tr>
    </table>` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1f2937,#111827);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.12em;">Monthly Performance Report</p>
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#ffffff;">${d.restaurantName}</h1>
    <p style="margin:0;font-size:16px;color:#f97316;font-weight:700;">${d.periodLabel}</p>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
    <table style="width:100%;border-collapse:collapse;">

      <!-- Summary Snapshot -->
      ${sectionHeader('Month-over-Month Snapshot', '📊')}
      <tr>
        <td colspan="4" style="padding:0 0 16px;">
          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;">Metric</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;">This Month</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;">Last Month</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;">Change</th>
              </tr>
            </thead>
            <tbody>${summaryRows}</tbody>
          </table>
        </td>
      </tr>

      <!-- Revenue details -->
      ${sectionHeader('Revenue & Orders', '💰')}
      <tr>
        <td colspan="4" style="padding:0 0 16px;">
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:26px;font-weight:800;color:#111827;">${fmt(d.revenue.current)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Gross Revenue</p>
              </td>
              <td style="padding:16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:26px;font-weight:800;color:#f97316;">${fmt(d.revenue.aovCurrent)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Avg. Order Value</p>
              </td>
              <td style="padding:16px;text-align:center;">
                <p style="margin:0;font-size:26px;font-weight:800;color:#0284c7;">${fmtInt(d.orders.current)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Total Orders</p>
              </td>
            </tr>
          </table>
          ${d.tips.total > 0 ? `
          <div style="margin-top:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;display:flex;gap:16px;justify-content:space-between;">
            <div><p style="margin:0;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Tips Collected</p><p style="margin:3px 0 0;font-size:18px;font-weight:800;color:#15803d;">${fmt(d.tips.total)}</p></div>
            <div><p style="margin:0;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Avg. Tip %</p><p style="margin:3px 0 0;font-size:18px;font-weight:800;color:#15803d;">${d.tips.avgPct}% ${d.tips.prevAvgPct !== null ? changeBadge(d.tips.changePct) : ''}</p></div>
            ${d.tips.prevAvgPct !== null ? `<div><p style="margin:0;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Last Month Avg. Tip</p><p style="margin:3px 0 0;font-size:18px;font-weight:800;color:#16a34a;">${d.tips.prevAvgPct}%</p></div>` : ''}
          </div>` : ''}
        </td>
      </tr>

      <!-- Peak Traffic -->
      ${sectionHeader('Peak Traffic', '⏰')}
      <tr>
        <td colspan="4" style="padding:0 0 8px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Orders by Day of Week</p>
          <table style="width:100%;border-collapse:collapse;">${peakDayRows}</table>
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding:0 0 16px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Busiest Hours</p>
          <div>${peakHoursList}</div>
        </td>
      </tr>

      <!-- Menu Performance -->
      ${sectionHeader('Menu Performance', '🍽')}
      <tr>
        <td colspan="4" style="padding:0 0 6px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em;">Top 5 Best Sellers (by quantity)</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f0fdf4;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#166534;border-bottom:1px solid #e5e7eb;">#</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#166534;border-bottom:1px solid #e5e7eb;">Item</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#166534;border-bottom:1px solid #e5e7eb;">Qty Sold</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#166534;border-bottom:1px solid #e5e7eb;">Revenue</th>
            </tr></thead>
            <tbody>${topItemRows}</tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding:0 0 6px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;">Bottom 5 (lowest quantity — review candidates)</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#fef2f2;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;border-bottom:1px solid #e5e7eb;">#</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;border-bottom:1px solid #e5e7eb;">Item</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#991b1b;border-bottom:1px solid #e5e7eb;">Qty Sold</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#991b1b;border-bottom:1px solid #e5e7eb;">Revenue</th>
            </tr></thead>
            <tbody>${bottomItemRows}</tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding:0 0 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:0.05em;">Top Revenue Items</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f0f9ff;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#075985;border-bottom:1px solid #e5e7eb;">#</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#075985;border-bottom:1px solid #e5e7eb;">Item</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#075985;border-bottom:1px solid #e5e7eb;">Revenue</th>
            </tr></thead>
            <tbody>${topRevenueRows}</tbody>
          </table>
        </td>
      </tr>

      <!-- Customer Insights -->
      ${sectionHeader('Customer Insights', '👥')}
      <tr>
        <td colspan="4" style="padding:0 0 16px;">
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:24px;font-weight:800;color:#4f46e5;">${fmtInt(d.customers.uniqueCount)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Unique Customers</p>
              </td>
              <td style="padding:14px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:24px;font-weight:800;color:#0284c7;">${fmtInt(d.customers.newCount)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">New</p>
              </td>
              <td style="padding:14px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                <p style="margin:0;font-size:24px;font-weight:800;color:#16a34a;">${fmtInt(d.customers.returningCount)}</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Returning</p>
              </td>
              <td style="padding:14px 16px;text-align:center;">
                <p style="margin:0;font-size:24px;font-weight:800;color:${d.customers.repeatRatePct >= 30 ? '#16a34a' : '#f97316'};">${d.customers.repeatRatePct}%</p>
                <p style="margin:3px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Repeat Rate</p>
              </td>
            </tr>
          </table>
          <p style="margin:10px 0 0;font-size:13px;color:#6b7280;text-align:center;">Avg. <strong style="color:#374151;">${d.customers.avgOrdersPerCustomer}</strong> orders per customer this month</p>
        </td>
      </tr>

    </table>

    ${reservationsSection}
    ${insightsSection}

  </div>

  <!-- Footer -->
  <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#9ca3af;">
    Powered by Wehanda · This report covers ${d.periodLabel}.<br>
    You receive this as the owner of ${d.restaurantName}.
  </p>
</div>
</body>
</html>`

  return { subject, html }
}
