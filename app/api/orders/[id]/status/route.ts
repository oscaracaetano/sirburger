import { NextRequest, NextResponse } from 'next/server'
import { transitionOrderStatus, InvalidTransitionError } from '@/lib/order-state'
import { OrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, actor } = body as { status: OrderStatus; actor?: string }

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })
    }

    const updatedOrder = await transitionOrderStatus(id, status, actor || 'sistema')

    return NextResponse.json(updatedOrder)
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error transitioning order status:', error)
    return NextResponse.json(
      { error: 'Error al cambiar el estado del pedido' },
      { status: 500 }
    )
  }
}
