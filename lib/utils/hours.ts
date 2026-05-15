import type { RestaurantHours } from '@/lib/types'

export function isRestaurantOpen(hours: RestaurantHours[], timezone: string): boolean {
  try {
    const now = new Date()
    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now)

    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    const dayPart = localTime.find(p => p.type === 'weekday')?.value ?? 'Sun'
    const hourPart = localTime.find(p => p.type === 'hour')?.value ?? '00'
    const minutePart = localTime.find(p => p.type === 'minute')?.value ?? '00'

    const dayOfWeek = dayMap[dayPart] ?? 0
    const currentMinutes = parseInt(hourPart) * 60 + parseInt(minutePart)

    const todayHours = hours.find(h => h.day_of_week === dayOfWeek)
    if (!todayHours || todayHours.is_closed) return false

    const [openH, openM] = todayHours.open_time.split(':').map(Number)
    const [closeH, closeM] = todayHours.close_time.split(':').map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  } catch {
    return false
  }
}

export function getLocalTime(timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
