import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body as { orderId?: string }

    if (!orderId) {
      return NextResponse.json(
        { error: 'El orderId es requerido' },
        { status: 400 }
      )
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Reset printedAt so the agent catches it on the next poll
    await db.$transaction([
      db.order.update({
        where: { id: orderId },
        data: {
          printedAt: null,
        },
      }),
      db.orderStatusLog.create({
        data: {
          orderId,
          status: order.status,
          actor: 'operadora (reimpresión de ticket)',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Ticket del pedido #${order.code} encolado para reimpresión.`,
    })
  } catch (error) {
    console.error('Error in /api/printer/reprint:', error)
    return NextResponse.json(
      { error: 'Error al solicitar reimpresión del ticket' },
      { status: 500 }
    )
  }
}
