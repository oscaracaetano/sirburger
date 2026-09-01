import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = process.env.PRINT_AGENT_TOKEN || 'token-sirburger-impresion-local-dev'

    if (authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Orders in preparation that haven't been printed yet
    const pendingOrders = await db.order.findMany({
      where: {
        status: { in: ['APROBADO', 'EN_PREPARACION'] },
        printedAt: null,
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const payload = pendingOrders.map((o) => ({
      orderId: o.id,
      code: o.code,
      barcodeValue: o.barcodeValue,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customer.name || 'Cliente',
      customerPhone: o.customer.phone,
      deliveryAddress: o.deliveryAddress,
      deliveryRef: o.deliveryRef,
      paymentMethod: o.paymentMethod,
      total: Number(o.total),
      items: o.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        modifiers: (i.modifiers as Array<{ name: string; priceDelta: number; qty?: number }>) || [],
        notes: i.notes,
      })),
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching pending prints:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
