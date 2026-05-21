/** UTC offset in minutes for a timezone at a given instant (positive = ahead of UTC) */
function tzOffsetMinutes(tz: string, at: Date): number {
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(at.toLocaleString('en-US', { timeZone: tz }))
  return Math.round((local.getTime() - utc.getTime()) / 60000)
}

/** UTC Date for 00:00:00 of a given YYYY-MM-DD in a timezone */
export function midnightUTC(dateStr: string, tz: string): Date {
  // Use noon on that day to safely determine the offset (avoids DST ambiguity at midnight)
  const noon = new Date(`${dateStr}T12:00:00Z`)
  const offset = tzOffsetMinutes(tz, noon)
  return new Date(new Date(`${dateStr}T00:00:00Z`).getTime() - offset * 60000)
}

/** Today's date as 'YYYY-MM-DD' in the given timezone */
export function todayInTz(tz: string, now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: tz })
}

/** UTC Date for the start of today (00:00:00) in the given timezone */
export function startOfToday(tz: string, now = new Date()): Date {
  return midnightUTC(todayInTz(tz, now), tz)
}

/** Shift a YYYY-MM-DD date string by n days (negative = back) */
export function shiftDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/** Full weekday name for a YYYY-MM-DD in a timezone */
export function weekdayName(dateStr: string, tz: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: tz, weekday: 'long' })
}

/** 0-based day of week (0=Sun … 6=Sat) for a YYYY-MM-DD in a timezone */
export function dayOfWeekInTz(dateStr: string, tz: string): number {
  const name = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' })
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}
