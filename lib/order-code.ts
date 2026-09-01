/**
 * Generate a unique human-readable order code.
 * Format: Letter + 4 digits, e.g., "A4837"
 */
export function generateOrderCode(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const number = Math.floor(1000 + Math.random() * 9000)
  return `${letter}${number}`
}

/**
 * Generate a unique barcode value for ticket printing.
 * Uses timestamp + random to ensure uniqueness.
 */
export function generateBarcodeValue(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `SB-${timestamp}-${random}`.toUpperCase()
}
