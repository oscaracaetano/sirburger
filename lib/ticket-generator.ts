export interface TicketOrderItem {
  quantity: number
  productName: string
  unitPrice?: number | string | null
  notes?: string | null
  modifiers?: Array<{
    name: string
    qty?: number
    priceDelta?: number | string | null
  }>
}

export interface TicketOrderData {
  id: string
  code: string
  isPriority?: boolean
  barcodeValue: string
  createdAt: string | Date
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  deliveryRef?: string | null
  total?: number | string | null
  paymentMethod?: string | null
  items: TicketOrderItem[]
}

export interface TicketConfig {
  driver: 'ZEBRA_ZPL' | 'ESCPOS_80MM' | 'ESCPOS_58MM' | string
  ticketHeader?: string
  copies?: number
  autoCut?: boolean
}

/**
 * Normaliza textos removiendo tildes o caracteres especiales que puedan corromperse
 * en impresoras térmicas monocromáticas con tablas de caracteres ASCII limitadas.
 */
function cleanText(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '')
}

function formatPrice(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return ''
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return ''
  return `$ ${num.toLocaleString('es-AR')}`
}


/**
 * Genera comandos nativos ZPL para impresoras Zebra (GC420t / ZD220 / ZP450).
 * Optimizado para rollos térmicos continuos o etiquetas de hasta 100mm de ancho.
 */
export function generateZplTicket(
  order: TicketOrderData,
  config?: TicketConfig,
  isTest = false
): string {
  const header = cleanText(config?.ticketHeader || 'SirBurger')
  const copies = config?.copies && config.copies > 1 ? config.copies : 1
  const dateObj = new Date(order.createdAt)
  const fechaStr = dateObj.toLocaleDateString('es-AR')
  const horaStr = dateObj.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  let y = 30
  const lines: string[] = []

  lines.push('^XA') // Inicio de etiqueta ZPL
  lines.push('^CI28') // UTF-8 Encoding

  if (copies > 1) {
    lines.push(`^PQ${copies}`)
  }

  // Header Title
  lines.push(`^FO20,${y}^A0N,32,32^FD${header}^FS`)
  y += 40

  // Order Code (Enorme)
  lines.push(`^FO20,${y}^A0N,55,55^FD#${order.code}^FS`)
  y += 65

  // PRIORITARIO (Si viene de intervención o es test prioritario)
  if (order.isPriority) {
    lines.push(`^FO20,${y}^GB560,45,45^FS`)
    lines.push(`^FO30,${y + 8}^A0N,30,30^FR^FD*** PRIORITARIO! (CAMBIO) ***^FS`)
    y += 55
  }

  if (isTest) {
    lines.push(`^FO20,${y}^A0N,26,26^FD*** TICKET DE PRUEBA DE CONEXION ***^FS`)
    y += 35
  }

  // Date and Time
  lines.push(`^FO20,${y}^A0N,24,24^FDFecha: ${fechaStr}  Hora: ${horaStr}^FS`)
  y += 35

  // Line separator
  lines.push(`^FO20,${y}^GB560,2,2^FS`)
  y += 15

  // Customer info
  if (order.customerName) {
    lines.push(
      `^FO20,${y}^A0N,26,26^FDCliente: ${cleanText(order.customerName)}^FS`
    )
    y += 30
  }
  if (order.customerPhone) {
    lines.push(`^FO20,${y}^A0N,24,24^FDCel: ${cleanText(order.customerPhone)}^FS`)
    y += 30
  }
  if (order.deliveryAddress) {
    lines.push(
      `^FO20,${y}^A0N,24,24^FDDirec: ${cleanText(order.deliveryAddress)}^FS`
    )
    y += 30
  }
  if (order.deliveryRef) {
    lines.push(
      `^FO20,${y}^A0N,22,22^FDRef: ${cleanText(order.deliveryRef)}^FS`
    )
    y += 30
  }

  // Line separator
  lines.push(`^FO20,${y}^GB560,2,2^FS`)
  y += 20

  // Items
  lines.push(`^FO20,${y}^A0N,26,26^FDPRODUCTOS PARA COCINA:^FS`)
  y += 35

  for (const item of order.items) {
    const itemPrice =
      item.unitPrice !== undefined && item.unitPrice !== null
        ? Number(item.unitPrice) * item.quantity
        : null
    const priceTxt = itemPrice !== null ? ` ($ ${itemPrice.toLocaleString('es-AR')})` : ''

    // Quantity + Product Name + Price
    lines.push(
      `^FO20,${y}^A0N,32,32^FD${item.quantity}x ${cleanText(item.productName)}${priceTxt}^FS`
    )
    y += 38

    // Modifiers / Exclusiones
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        const qtyTxt = mod.qty && mod.qty > 1 ? ` (x${mod.qty})` : ''
        const modPrice = mod.priceDelta ? Number(mod.priceDelta) * (mod.qty || 1) : 0
        const modPriceStr = modPrice > 0 ? `+${formatPrice(modPrice)}` : ''
        lines.push(
          `^FO45,${y}^A0N,24,24^FD- ${cleanText(mod.name)}${qtyTxt} ${modPriceStr}^FS`
        )
        y += 28
      }
    }

    // Notes
    if (item.notes) {
      lines.push(
        `^FO45,${y}^A0N,24,24^FD* NOTA: ${cleanText(item.notes)}^FS`
      )
      y += 28
    }

    y += 8
  }

  // Line separator
  y += 10
  lines.push(`^FO20,${y}^GB560,2,2^FS`)
  y += 25

  // Totales y Pago para Repartidor
  if (order.total !== undefined && order.total !== null) {
    lines.push(`^FO20,${y}^A0N,34,34^FDTOTAL A COBRAR: ${formatPrice(order.total)}^FS`)
    y += 38
  }
  if (order.paymentMethod) {
    const paymentLabels: Record<string, string> = {
      EFECTIVO: 'EFECTIVO',
      POS: 'POS (Tarjeta al entregar)',
      TRANSFERENCIA: 'TRANSFERENCIA',
    }
    const label = paymentLabels[order.paymentMethod] || order.paymentMethod
    lines.push(`^FO20,${y}^A0N,28,28^FDMEDIO DE PAGO: ${cleanText(label)}^FS`)
    y += 34
  }

  // Line separator
  lines.push(`^FO20,${y}^GB560,2,2^FS`)
  y += 25

  // Barcode (Code 128) - lectura instantánea pistola (código limpio sin caracteres especiales)
  const barcode = (order.code || order.barcodeValue || '').replace(/^#/, '').replace(/^SB-/, '')
  lines.push(`^FO40,${y}^BY3,3,70^BCN,70,Y,N,N^FD${barcode}^FS`)
  y += 100

  // Footer
  lines.push(`^FO20,${y}^A0N,20,20^FDSirBurger - Cocina y Despacho^FS`)

  lines.push('^XZ') // Fin de etiqueta ZPL

  return lines.join('\n')
}

/**
 * Genera comandos ESC/POS para comanderas térmicas estándar (Unnion TP85, TP95, XL-SCAN, etc.)
 * con soporte para ancho de 80mm o 58mm, códigos de barra y guillotina automática.
 */
export function generateEscPosTicket(
  order: TicketOrderData,
  config?: TicketConfig,
  isTest = false
): string {
  const is58mm = config?.driver === 'ESCPOS_58MM'
  const lineWidth = is58mm ? 32 : 48
  const separator = '-'.repeat(lineWidth)
  const header = cleanText(config?.ticketHeader || 'SirBurger')
  const dateObj = new Date(order.createdAt)
  const fechaStr = dateObj.toLocaleDateString('es-AR')
  const horaStr = dateObj.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Byte commands ESC/POS
  const ESC = '\x1B'
  const GS = '\x1D'

  const CMD_INIT = `${ESC}@` // Inicializar
  const CMD_ALIGN_CENTER = `${ESC}a\x01`
  const CMD_ALIGN_LEFT = `${ESC}a\x00`
  const CMD_BOLD_ON = `${ESC}E\x01`
  const CMD_BOLD_OFF = `${ESC}E\x00`
  const CMD_DOUBLE_ON = `${GS}!\x11` // Doble ancho y alto
  const CMD_DOUBLE_OFF = `${GS}!\x00`
  const CMD_INVERT_ON = `${GS}B\x01` // Texto blanco sobre fondo negro
  const CMD_INVERT_OFF = `${GS}B\x00`

  let out = CMD_INIT

  // 1. Header
  out += CMD_ALIGN_CENTER
  out += `${CMD_BOLD_ON}${header}${CMD_BOLD_OFF}\n`

  // 2. Order Code (Doble tamaño)
  out += `${CMD_DOUBLE_ON}#${order.code}${CMD_DOUBLE_OFF}\n`

  // 3. PRIORITARIO
  if (order.isPriority) {
    out += `\n${CMD_INVERT_ON}  *** PRIORITARIO! (CAMBIO) ***  ${CMD_INVERT_OFF}\n`
  }

  if (isTest) {
    out += `\n${CMD_BOLD_ON}*** TICKET DE PRUEBA ***${CMD_BOLD_OFF}\n`
  }

  // 4. Metadata
  out += CMD_ALIGN_LEFT
  out += `Fecha: ${fechaStr}  Hora: ${horaStr}\n`
  out += `${separator}\n`

  // Customer info
  if (order.customerName) {
    out += `Cliente: ${CMD_BOLD_ON}${cleanText(order.customerName)}${CMD_BOLD_OFF}\n`
  }
  if (order.customerPhone) {
    out += `Tel: ${cleanText(order.customerPhone)}\n`
  }
  if (order.deliveryAddress) {
    out += `Direc: ${CMD_BOLD_ON}${cleanText(order.deliveryAddress)}${CMD_BOLD_OFF}\n`
  }
  if (order.deliveryRef) {
    out += `Ref: ${cleanText(order.deliveryRef)}\n`
  }

  out += `${separator}\n`
  out += `${CMD_BOLD_ON}PRODUCTOS PARA COCINA:${CMD_BOLD_OFF}\n`

  // Items
  for (const item of order.items) {
    const itemPrice =
      item.unitPrice !== undefined && item.unitPrice !== null
        ? Number(item.unitPrice) * item.quantity
        : null
    const priceStr = itemPrice !== null ? ` ($ ${itemPrice.toLocaleString('es-AR')})` : ''

    out += `\n${CMD_BOLD_ON}${item.quantity}x ${cleanText(item.productName)}${priceStr}${CMD_BOLD_OFF}\n`

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        const qtyTxt = mod.qty && mod.qty > 1 ? ` (x${mod.qty})` : ''
        const modPrice = mod.priceDelta ? Number(mod.priceDelta) * (mod.qty || 1) : 0
        const modPriceStr = modPrice > 0 ? ` (+ $ ${modPrice.toLocaleString('es-AR')})` : ''
        out += `  - ${cleanText(mod.name)}${qtyTxt}${modPriceStr}\n`
      }
    }

    if (item.notes) {
      out += `  * NOTA: ${CMD_BOLD_ON}${cleanText(item.notes)}${CMD_BOLD_OFF}\n`
    }
  }

  out += `\n${separator}\n`

  // Totales y Medio de Pago (Esenciales para el Repartidor)
  out += `${CMD_BOLD_ON}`
  if (order.total !== undefined && order.total !== null) {
    out += `TOTAL A COBRAR: $ ${Number(order.total).toLocaleString('es-AR')}\n`
  }

  if (order.paymentMethod) {
    const paymentLabels: Record<string, string> = {
      EFECTIVO: 'EFECTIVO',
      POS: 'POS (Tarjeta al entregar)',
      TRANSFERENCIA: 'TRANSFERENCIA',
    }
    const label = paymentLabels[order.paymentMethod] || order.paymentMethod
    out += `MEDIO DE PAGO:  ${label}\n`
  }
  out += `${CMD_BOLD_OFF}`
  out += `${separator}\n\n`

  // Barcode (Code 128)
  const barcode = (order.code || order.barcodeValue || '').replace(/^#/, '').replace(/^SB-/, '')
  out += CMD_ALIGN_CENTER
  out += `${GS}h\x40` // Altura del código (64 dots)
  out += `${GS}w\x02` // Ancho del módulo
  out += `${GS}H\x02` // Imprimir texto legible debajo del código
  out += `${GS}k\x49${String.fromCharCode(barcode.length + 2)}{B${barcode}` // Code 128 tipo B

  out += `\nSirBurger - Cocina y Despacho\n`

  // Feed paper
  out += '\n\n\n\n'

  // Auto Cut (Guillotina)
  if (config?.autoCut) {
    out += `${GS}V\x00` // Corte total
  } else {
    out += `${GS}V\x01` // Corte parcial
  }

  return out
}
