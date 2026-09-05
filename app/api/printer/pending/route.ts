import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testPrintQueue } from '@/lib/test-printer-queue'
import {
  generateZplTicket,
  generateEscPosTicket,
  TicketOrderData,
} from '@/lib/ticket-generator'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Obtener la configuración actual de la impresora
    let config = await db.printerConfig.findUnique({
      where: { id: 'default' },
    })

    if (!config) {
      config = await db.printerConfig.create({
        data: {
          id: 'default',
          driver: 'ZEBRA_ZPL',
          connectionType: 'USB_WINDOWS',
          printerName: 'Zebra GC420t',
          tcpHost: '192.168.1.150',
          tcpPort: 9100,
          autoCut: false,
          soundAlert: true,
          copies: 1,
          ticketHeader: 'SirBurger',
          printLogo: true,
          active: true,
        },
      })
    }

    if (!config.active) {
      return NextResponse.json({ config, jobs: [] })
    }

    const jobs = []

    // 2. Verificar si hay tickets de prueba solicitados
    if (testPrintQueue.hasJobs()) {
      const testJob = testPrintQueue.pop()
      if (testJob) {
        const testOrder: TicketOrderData = {
          id: testJob.id,
          code: 'TEST99',
          isPriority: true,
          barcodeValue: 'TEST99',
          createdAt: new Date(),
          customerName: 'Prueba de Impresión',
          customerPhone: '098 000 000',
          deliveryAddress: 'Estación de Cocina SirBurger',
          deliveryRef: 'Comprobación de conectividad y corte',
          total: 14100,
          paymentMethod: 'EFECTIVO',
          items: [
            {
              quantity: 2,
              productName: 'Hamburguesa Doble Cheddar',
              unitPrice: 5800,
              notes: 'Punto jugoso',
              modifiers: [
                { name: 'Extra Bacon', qty: 2, priceDelta: 800 },
                { name: 'Sin Pepinillos', qty: 1 },
              ],
            },
            {
              quantity: 1,
              productName: 'Papas Rústicas Grandes',
              unitPrice: 2500,
              notes: 'Sal fina',
              modifiers: [{ name: 'Cheddar Fundido', qty: 1, priceDelta: 400 }],
            },
          ],
        }

        const raw =
          config.driver === 'ZEBRA_ZPL'
            ? generateZplTicket(testOrder, config, true)
            : generateEscPosTicket(testOrder, config, true)

        jobs.push({
          id: testJob.id,
          orderId: null,
          isTest: true,
          code: testOrder.code,
          isPriority: true,
          driver: config.driver,
          connectionType: config.connectionType,
          printerName: config.printerName,
          tcpHost: config.tcpHost,
          tcpPort: config.tcpPort || 9100,
          soundAlert: config.soundAlert,
          rawPayload: raw,
        })
      }
    }

    // 3. Buscar pedidos reales pendientes de impresión física en cocina (o solicitados para reimpresión)
    // NOTA: Los pedidos en estado RECIBIDO (recién ingresados por el cliente) NO se imprimen automáticamente.
    // Solo se imprimen cuando la operadora los manda a cocina (APROBADO / EN_PREPARACION) o solicita reimpresión.
    const pendingOrders = await db.order.findMany({
      where: {
        status: {
          notIn: ['RECIBIDO', 'INTERVENCION', 'CANCELADO'],
        },
        printedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        statusLogs: true,
      },
      take: 10,
    })

    for (const order of pendingOrders) {
      const hadBeenInKitchen = order.statusLogs.some(
        (l) => l.status === 'EN_PREPARACION' || l.status === 'LISTO'
      )
      const wasIntervened = order.statusLogs.some(
        (l) => l.status === 'INTERVENCION'
      )
      const isPriority = hadBeenInKitchen && wasIntervened

      const ticketOrder: TicketOrderData = {
        id: order.id,
        code: order.code,
        isPriority,
        barcodeValue: order.barcodeValue,
        createdAt: order.createdAt,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        deliveryAddress: order.deliveryAddress,
        deliveryRef: order.deliveryRef,
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        items: order.items.map((i) => ({
          quantity: i.quantity,
          productName: i.product.name,
          unitPrice: Number(i.unitPrice),
          notes: i.notes,
          modifiers: Array.isArray(i.modifiers)
            ? (i.modifiers as Array<{ name: string; qty?: number; priceDelta?: number }>)
            : [],
        })),
      }

      const raw =
        config.driver === 'ZEBRA_ZPL'
          ? generateZplTicket(ticketOrder, config, false)
          : generateEscPosTicket(ticketOrder, config, false)

      jobs.push({
        id: `job-${order.id}`,
        orderId: order.id,
        isTest: false,
        code: order.code,
        isPriority,
        driver: config.driver,
        connectionType: config.connectionType,
        printerName: config.printerName,
        tcpHost: config.tcpHost,
        tcpPort: config.tcpPort || 9100,
        soundAlert: config.soundAlert,
        rawPayload: raw,
      })
    }

    return NextResponse.json({
      config,
      jobs,
    })
  } catch (error) {
    console.error('Error in /api/printer/pending:', error)
    return NextResponse.json(
      { error: 'Error al consultar cola de impresión' },
      { status: 500 }
    )
  }
}
