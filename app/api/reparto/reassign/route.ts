import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, targetCourierId } = body as {
      orderId: string
      targetCourierId: string
    }

    if (!orderId || !targetCourierId) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (orderId, targetCourierId)' },
        { status: 400 }
      )
    }

    const [order, targetCourier] = await Promise.all([
      db.order.findUnique({
        where: { id: orderId },
        include: { dispatch: { include: { courier: true } } },
      }),
      db.courier.findUnique({ where: { id: targetCourierId } }),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (!targetCourier) {
      return NextResponse.json({ error: 'Repartidor destino no encontrado' }, { status: 404 })
    }

    // Find or create active dispatch for target courier
    let targetDispatch = await db.dispatch.findFirst({
      where: {
        courierId: targetCourierId,
        closedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!targetDispatch) {
      targetDispatch = await db.dispatch.create({
        data: {
          courierId: targetCourierId,
        },
      })
    }

    const previousCourierName = order.dispatch?.courier?.name || 'repartidor anterior'

    // Move order to new dispatch and record log
    await db.$transaction([
      db.order.update({
        where: { id: orderId },
        data: {
          dispatchId: targetDispatch.id,
          status: 'EN_CALLE',
        },
      }),
      db.orderStatusLog.create({
        data: {
          orderId,
          status: 'EN_CALLE',
          actor: `operadora (cambio de mochila: de ${previousCourierName} a ${targetCourier.name})`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Pedido #${order.code} movido a la mochila de ${targetCourier.name}`,
    })
  } catch (error) {
    console.error('Error reassigning order dispatch:', error)
    return NextResponse.json(
      { error: 'Error al cambiar de mochila el pedido' },
      { status: 500 }
    )
  }
}
