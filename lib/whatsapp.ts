const COUNTRY_CODE =
  process.env.WHATSAPP_COUNTRY_CODE ||
  process.env.NEXT_PUBLIC_WHATSAPP_COUNTRY_CODE ||
  '598'

/**
 * Normaliza el número de teléfono para WhatsApp Web (formato internacional).
 * Soporta números de Uruguay (091090705 -> 59891090705) e internacionales (+598...).
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ''

  // Limpiar espacios, guiones, paréntesis, puntos y el signo más
  let clean = phone.replace(/[\s\-\(\)\+\.]/g, '')

  // Si ya tiene el prefijo de Uruguay (598)
  if (clean.startsWith('598')) {
    return clean
  }

  // Si empieza con 0 (ej: 091090705 -> 91090705)
  if (clean.startsWith('0')) {
    clean = clean.substring(1)
  }

  // Si tiene 8 dígitos y empieza con 9 (móvil estándar de Uruguay: 91090705)
  if (clean.length === 8 && clean.startsWith('9')) {
    return `598${clean}`
  }

  // Si no empieza con el código de país configurado, agregarlo
  if (!clean.startsWith(COUNTRY_CODE)) {
    return `${COUNTRY_CODE}${clean}`
  }

  return clean
}

/**
 * Genera el enlace de WhatsApp Web con mensaje prellenado.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = normalizePhoneNumber(phone)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

/**
 * Genera el mensaje para notificar al cliente cuando el pedido sale a la calle.
 */
export function generateEnCalleMessage(
  orderCode: string,
  total: string,
  paymentMethod: string
): string {
  const paymentLabels: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    POS: 'POS (tarjeta)',
    TRANSFERENCIA: 'Transferencia',
  }

  return (
    `*Pedido #${orderCode}*\n\n` +
    `🍔 Tu pedido de SirBurger ya está en camino a tu domicilio.\n\n` +
    `💰 *Importe:* $${total}\n` +
    `💳 *Medio de pago:* ${paymentLabels[paymentMethod] || paymentMethod}\n\n` +
    `Te recomendamos estar atento para recibir al repartidor. ¡Muchas gracias!`
  )
}
