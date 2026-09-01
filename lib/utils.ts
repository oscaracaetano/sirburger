import { type ClassValue, clsx } from 'clsx'

/**
 * Format a Decimal/number as currency (Argentine peso).
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Format a date to a human-readable string in Spanish.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format a time to HH:mm.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calculate elapsed time between two dates in a human-readable format.
 */
export function elapsedTime(from: Date, to: Date = new Date()): string {
  const diffMs = to.getTime() - from.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `${diffMin} min`

  const hours = Math.floor(diffMin / 60)
  const minutes = diffMin % 60
  return `${hours}h ${minutes}m`
}

/**
 * Get the delay alert color based on elapsed minutes and thresholds.
 */
export function getDelayColor(
  elapsedMinutes: number,
  expectedMinutes: number
): 'green' | 'yellow' | 'orange' | 'red' {
  const ratio = elapsedMinutes / expectedMinutes
  if (ratio <= 0.7) return 'green'
  if (ratio <= 1.0) return 'yellow'
  if (ratio <= 1.3) return 'orange'
  return 'red'
}
