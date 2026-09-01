import { db } from './db'

interface TimeSlot {
  openTime: string  // "HH:mm"
  closeTime: string // "HH:mm"
  isClosed: boolean
}

/**
 * Parse a time string "HH:mm" into minutes since midnight.
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if a given time (in minutes since midnight) falls within a time slot.
 * Handles midnight crossing (e.g., 19:00 - 01:00).
 */
export function isTimeInSlot(
  currentMinutes: number,
  openMinutes: number,
  closeMinutes: number
): boolean {
  if (closeMinutes > openMinutes) {
    // Normal case: e.g., 19:00 - 23:00
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  } else {
    // Midnight crossing: e.g., 19:00 - 01:00
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes
  }
}

/**
 * Check if the business is currently open.
 * Returns { isOpen, nextOpenDay, nextOpenTime } for display purposes.
 */
export async function getBusinessStatus(now: Date = new Date()) {
  const dayOfWeek = now.getDay() // 0=Sunday, 6=Saturday
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const allHours = await db.businessHours.findMany({
    orderBy: { dayOfWeek: 'asc' },
  })

  // Check today
  const todayHours = allHours.find((h) => h.dayOfWeek === dayOfWeek)

  if (todayHours && !todayHours.isClosed) {
    const openMin = parseTime(todayHours.openTime)
    const closeMin = parseTime(todayHours.closeTime)

    if (isTimeInSlot(currentMinutes, openMin, closeMin)) {
      return { isOpen: true, message: null }
    }
  }

  // Also check if we're in the midnight-crossing window from yesterday
  const yesterdayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const yesterdayHours = allHours.find((h) => h.dayOfWeek === yesterdayIndex)

  if (yesterdayHours && !yesterdayHours.isClosed) {
    const openMin = parseTime(yesterdayHours.openTime)
    const closeMin = parseTime(yesterdayHours.closeTime)

    if (closeMin < openMin && currentMinutes < closeMin) {
      return { isOpen: true, message: null }
    }
  }

  // Find next open day
  for (let i = 0; i < 7; i++) {
    const checkDay = (dayOfWeek + i) % 7
    const hours = allHours.find((h) => h.dayOfWeek === checkDay)
    if (hours && !hours.isClosed) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      if (i === 0) {
        return {
          isOpen: false,
          message: `Abrimos hoy a las ${hours.openTime}`,
        }
      }
      return {
        isOpen: false,
        message: `Abrimos el ${dayNames[checkDay]} a las ${hours.openTime}`,
      }
    }
  }

  return { isOpen: false, message: 'Horario no disponible' }
}
