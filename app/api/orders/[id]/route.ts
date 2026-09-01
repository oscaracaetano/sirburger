import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PaymentMethod } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        statusLogs: {
          orderBy: { createdAt: 'asc' },
        },
        interventions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order detail:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryRef,
      paymentMethod,
      items,
    } = body as {
      customerName?: string
      customerPhone?: string
      deliveryAddress?: string
      deliveryRef?: string
      paymentMethod?: PaymentMethod
      items?: Array<{
        productId: string
        quantity: number
        unitPrice: number
        modifiers?: Array<{ name: string; priceDelta: number; qty?: number }>
        notes?: string
      }>
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { customer: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // Calculate updated total from items
    let newTotal = 0
    if (items && Array.isArray(items)) {
      newTotal = items.reduce((sum, it) => {
        const itemModifiersCost = (it.modifiers || []).reduce((mSum, m) => {
          const qty = m.qty || 1
          return mSum + Number(m.priceDelta) * qty
        }, 0)
        return sum + (Number(it.unitPrice) + itemModifiersCost) * it.quantity
      }, 0)
    }

    // Execute transaction to update customer, order, items, and log
    const updated = await db.$transaction(async (tx) => {
      // 1. Update customer if provided
      if (customerName !== undefined || customerPhone !== undefined) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            name: customerName !== undefined ? customerName : order.customer.name,
            phone: customerPhone !== undefined ? customerPhone : order.customer.phone,
          },
        })
      }

      // 2. Update order fields
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          deliveryAddress: deliveryAddress ?? order.deliveryAddress,
          deliveryRef: deliveryRef !== undefined ? deliveryRef : order.deliveryRef,
          paymentMethod: paymentMethod ?? order.paymentMethod,
          ...(items && items.length > 0 ? { total: newTotal } : {}),
          // Reset printedAt so kitchen prints the updated ticket if re-sent
          printedAt: null,
        },
      })

      // 3. Replace order items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: id } })
        await tx.orderItem.createMany({
          data: items.map((it) => ({
            orderId: id,
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            modifiers: (it.modifiers || []) as object,
            notes: it.notes || null,
          })),
        })
      }

      // 4. Log modification
      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          status: order.status,
          actor: 'operadora (modificación de datos/pedido)',
        },
      })

      return updatedOrder
    })

    // Fetch refreshed complete order
    const fullOrder = await db.order.findUnique({
      where: { id: updated.id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        statusLogs: {
          orderBy: { createdAt: 'asc' },
        },
        interventions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json({ success: true, order: fullOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Error al actualizar los datos del pedido' },
      { status: 500 }
    )
  }
}
