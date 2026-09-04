import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, isTest } = body as {
      orderId?: string | null
      isTest?: boolean
    }

    if (isTest || !orderId) {
      return NextResponse.json({ success: true, message: 'Test ack recibido' })
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    await db.$transaction([
      db.order.update({
        where: { id: orderId },
        data: {
          printedAt: new Date(),
        },
      }),
      db.orderStatusLog.create({
        data: {
          orderId,
          status: order.status,
          actor: 'impresora_cocina',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Pedido #${order.code} marcado como impreso`,
    })
  } catch (error) {
    console.error('Error in /api/printer/ack:', error)
    return NextResponse.json(
      { error: 'Error al confirmar impresión' },
      { status: 500 }
    )
  }
}
