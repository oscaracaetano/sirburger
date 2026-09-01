import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOrderCode, generateBarcodeValue } from '@/lib/order-code'
import { PaymentMethod } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const orders = await db.order.findMany({
    where: {
      status: {
        notIn: ['ENTREGADO', 'CANCELADO'],
      },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
  })

  return NextResponse.json(orders)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryRef,
      paymentMethod,
      items,
    } = body as {
      customerName: string
      customerPhone: string
      deliveryAddress: string
      deliveryRef?: string
      paymentMethod: PaymentMethod
      items: Array<{
        productId: string
        quantity: number
        modifiers: Array<{ name: string; priceDelta: number; qty?: number }>
        notes?: string
      }>
    }

    // Validate required fields
    if (!customerPhone || !deliveryAddress || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Medio de pago inválido' },
        { status: 400 }
      )
    }

    // Find or create customer
    let customer = await db.customer.findUnique({
      where: { phone: customerPhone },
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          phone: customerPhone,
          name: customerName,
        },
      })
    } else if (customerName && !customer.name) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { name: customerName },
      })
    }

    // Calculate prices
    const productIds = items.map((item) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    let total = 0
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`)
      }

      let unitPrice = Number(product.basePrice)
      if (item.modifiers) {
        for (const mod of item.modifiers) {
          unitPrice += mod.priceDelta * (mod.qty || 1)
        }
      }

      total += unitPrice * item.quantity

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        modifiers: item.modifiers || [],
        notes: item.notes,
      }
    })

    // Generate unique order code (retry if collision)
    let code = generateOrderCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.order.findUnique({ where: { code } })
      if (!existing) break
      code = generateOrderCode()
      attempts++
    }

    const barcodeValue = generateBarcodeValue()

    // Create the order with items and initial status log
    const order = await db.order.create({
      data: {
        code,
        customerId: customer.id,
        deliveryAddress,
        deliveryRef,
        paymentMethod,
        total,
        barcodeValue,
        items: {
          create: orderItems,
        },
        statusLogs: {
          create: {
            status: 'RECIBIDO',
            actor: 'sistema',
          },
        },
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Error al crear el pedido' },
      { status: 500 }
    )
  }
}
