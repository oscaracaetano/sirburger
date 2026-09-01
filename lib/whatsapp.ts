const COUNTRY_CODE = process.env.WHATSAPP_COUNTRY_CODE || '549'

/**
 * Generate a WhatsApp Web link with a pre-filled message.
 * Opens wa.me with the customer's phone number and the message.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Clean the phone number: remove spaces, dashes, parentheses, plus signs
  let cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '')

  // If it doesn't start with country code, add it
  if (!cleanPhone.startsWith(COUNTRY_CODE)) {
    // Remove leading 0 if present
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1)
    }
    cleanPhone = COUNTRY_CODE + cleanPhone
  }

  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

/**
 * Generate the "order on its way" message.
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
    `Pedido #${orderCode}\n\n` +
    `Tu pedido ya está en camino.\n\n` +
    `Importe: $${total}\n` +
    `Medio de pago: ${paymentLabels[paymentMethod] || paymentMethod}\n\n` +
    `Te recomendamos estar atento para recibir al repartidor.`
  )
}
