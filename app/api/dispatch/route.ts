import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { transitionOrderStatus } from '@/lib/order-state'
import { OrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { courierId, orderIds } = body as {
      courierId: string
      orderIds: string[]
    }

    if (!courierId || !orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Faltan datos de repartidor o pedidos' },
        { status: 400 }
      )
    }

    // 1. Create the Dispatch record
    const dispatch = await db.dispatch.create({
      data: {
        courierId,
        closedAt: new Date(),
      },
    })

    // 2. Link orders to dispatch and transition each to EN_CALLE
    for (const orderId of orderIds) {
      await db.order.update({
        where: { id: orderId },
        data: { dispatchId: dispatch.id },
      })
      await transitionOrderStatus(orderId, OrderStatus.EN_CALLE, 'despacho')
    }

    return NextResponse.json({ success: true, dispatchId: dispatch.id })
  } catch (error) {
    console.error('Error creating dispatch:', error)
    return NextResponse.json(
      { error: 'Error al procesar el despacho' },
      { status: 500 }
    )
  }
}
