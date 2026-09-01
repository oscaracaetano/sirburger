/**
 * Agente de Impresión Local — SirBurger
 *
 * Corre en una PC o Raspberry Pi en el local de SirBurger conectada a la impresora térmica.
 * Consulta periódicamente la API de Next.js por pedidos pendientes y los envía a imprimir.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const PRINT_AGENT_TOKEN =
  process.env.PRINT_AGENT_TOKEN || 'token-sirburger-impresion-local-dev'
const POLL_INTERVAL_MS = 3000

interface PrintJob {
  orderId: string
  code: string
  barcodeValue: string
  isPriority?: boolean
  createdAt: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryRef: string | null
  paymentMethod: string
  total: number
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    modifiers: Array<{ name: string; priceDelta: number; qty?: number }>
    notes?: string
  }>
}

function formatTicket(job: PrintJob): string {
  const line = '------------------------------------------'
  const doubleLine = '=========================================='

  let output = `\n`

  if (job.isPriority) {
    output += `${doubleLine}\n`
    output += `       🚨🚨🚨 ¡¡¡ PRIORITARIO !!! 🚨🚨🚨\n`
    output += `        (RE-INGRESO POR INTERVENCIÓN)\n`
    output += `       * DESCARTAR TICKET ANTERIOR *\n`
    output += `${doubleLine}\n`
  }

  output += `${doubleLine}\n`
  output += `           🍔 SIRBURGER DELIVERY\n`
  output += `           TICKET DE COCINA Y REPARTO\n`
  output += `${doubleLine}\n`
  output += ` PEDIDO: #${job.code} ${job.isPriority ? '>>> [PRIORITARIO] <<<' : ''}\n`
  output += ` HORA:   ${new Date(job.createdAt).toLocaleTimeString('es-AR')}\n`
  output += `${line}\n`
  output += ` CLIENTE: ${job.customerName}\n`
  output += ` TEL:     ${job.customerPhone}\n`
  output += ` DIR:     ${job.deliveryAddress}\n`
  if (job.deliveryRef) {
    output += ` REF:     ${job.deliveryRef}\n`
  }
  output += `${line}\n`
  output += ` DETALLE DE PREPARACIÓN:\n\n`

  job.items.forEach((item, index) => {
    output += ` [ ] ${item.quantity}x ${item.productName.toUpperCase()}\n`
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((m) => {
        output += `     >> ${m.name} ${m.qty && m.qty > 1 ? `(x${m.qty})` : ''}\n`
      })
    }
    if (item.notes) {
      output += `     ** NOTA: ${item.notes} **\n`
    }
    output += `\n`
  })

  output += `${line}\n`
  output += ` TOTAL: $${job.total.toLocaleString('es-AR')}\n`
  output += ` PAGO:  ${job.paymentMethod}\n`
  output += `${line}\n`
  output += ` CODIGO DE BARRAS: [ ||||| ${job.barcodeValue} ||||| ]\n`
  output += `${doubleLine}\n\n`

  return output
}

async function sendToPrinter(ticketText: string) {
  // En producción, acá se envía al puerto COM / USB / Raw Socket de la impresora térmica ESC/POS.
  // En desarrollo / simulación, se imprime en consola con formato de ticket.
  console.log(ticketText)
}

async function pollAndPrint() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/kitchen/pending-prints`, {
      headers: {
        Authorization: `Bearer ${PRINT_AGENT_TOKEN}`,
      },
    })

    if (!res.ok) {
      console.error(`[PrintAgent] Error HTTP: ${res.status}`)
      return
    }

    const jobs: PrintJob[] = (await res.json()) as PrintJob[]

    if (jobs && jobs.length > 0) {
      console.log(`[PrintAgent] Se encontraron ${jobs.length} tickets pendientes de impresión:`)

      for (const job of jobs) {
        console.log(`[PrintAgent] Imprimiendo pedido #${job.code}...`)
        const formatted = formatTicket(job)
        await sendToPrinter(formatted)

        // Confirm print
        const ackRes = await fetch(`${API_BASE_URL}/api/kitchen/print-ack`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PRINT_AGENT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId: job.orderId }),
        })

        if (ackRes.ok) {
          console.log(`[PrintAgent] Pedido #${job.code} impreso y confirmado ✓`)
        }
      }
    }
  } catch (err) {
    console.error('[PrintAgent] Error de conexión:', err)
  }
}

console.log('🖨️  SirBurger Print Agent iniciado')
console.log(`📡 Conectado a: ${API_BASE_URL}`)
console.log(`⏱️  Frecuencia de sondeo: ${POLL_INTERVAL_MS / 1000}s\n`)

setInterval(pollAndPrint, POLL_INTERVAL_MS)
pollAndPrint()
