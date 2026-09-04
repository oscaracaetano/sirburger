import { db } from './db'

/**
 * Genera códigos de pedido consecutivos e incrementales con formato:
 * Letra + 4 dígitos (ej: "A0001", "A0002", ... "A9999" -> "B0001")
 */
export async function generateOrderCode(): Promise<string> {
  // Buscar pedidos ordenados por fecha de creación más reciente
  const recentOrders = await db.order.findMany({
    select: { code: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Detectar si ya existen pedidos bajo el nuevo formato secuencial (ej: A0001, A0002...)
  const sequentialPattern = /^([A-Z])(\d{4})$/

  let lastSequential: { letter: string; num: number } | null = null

  // Verificar si la serie A0001 en adelante ya comenzó
  const hasSeriesStarted = recentOrders.some((o) => /^A\d{4}$/.test(o.code))

  if (hasSeriesStarted) {
    for (const order of recentOrders) {
      const match = order.code.match(sequentialPattern)
      if (match) {
        lastSequential = {
          letter: match[1],
          num: parseInt(match[2], 10),
        }
        break
      }
    }
  }

  let nextLetter = 'A'
  let nextNum = 1

  if (hasSeriesStarted && lastSequential) {
    nextNum = lastSequential.num + 1
    nextLetter = lastSequential.letter

    if (nextNum > 9999) {
      const nextCharCode = nextLetter.charCodeAt(0) + 1
      nextLetter = nextCharCode <= 90 ? String.fromCharCode(nextCharCode) : 'A'
      nextNum = 1
    }
  }

  let candidate = `${nextLetter}${String(nextNum).padStart(4, '0')}`

  // Garantizar unicidad contra la base de datos
  let attempts = 0
  while (attempts < 100) {
    const existing = await db.order.findUnique({ where: { code: candidate } })
    if (!existing) break

    nextNum++
    if (nextNum > 9999) {
      const nextCharCode = nextLetter.charCodeAt(0) + 1
      nextLetter = nextCharCode <= 90 ? String.fromCharCode(nextCharCode) : 'A'
      nextNum = 1
    }
    candidate = `${nextLetter}${String(nextNum).padStart(4, '0')}`
    attempts++
  }

  return candidate
}

/**
 * Genera el valor de código de barras para el ticket térmico y la pistola lectora.
 */
export function generateBarcodeValue(orderCode?: string): string {
  if (orderCode) {
    return `SB-${orderCode}`
  }
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `SB-${timestamp}-${random}`.toUpperCase()
}
