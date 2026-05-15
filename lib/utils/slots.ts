import type { RestaurantHours } from '@/lib/types'

export function generateTimeSlots(hours: RestaurantHours[], dateStr: string): string[] {
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay()
  const todayHours = hours.find(h => h.day_of_week === dayOfWeek)
  if (!todayHours || todayHours.is_closed) return []

  const [oh, om] = todayHours.open_time.split(':').map(Number)
  const [ch, cm] = todayHours.close_time.split(':').map(Number)
  const slots: string[] = []
  let minutes = oh * 60 + om
  const closeMinutes = ch * 60 + cm

  while (minutes + 30 <= closeMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    minutes += 30
  }
  return slots
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
