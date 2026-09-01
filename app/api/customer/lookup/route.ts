import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone || phone.trim().length < 6) {
      return NextResponse.json({ found: false })
    }

    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '')

    const customer = await db.customer.findFirst({
      where: {
        phone: {
          contains: cleanPhone,
        },
      },
      include: {
        addresses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ found: false })
    }

    const lastAddress =
      customer.addresses[0]?.address || customer.orders[0]?.deliveryAddress || ''
    const lastRef =
      customer.addresses[0]?.reference || customer.orders[0]?.deliveryRef || ''

    return NextResponse.json({
      found: true,
      name: customer.name || '',
      address: lastAddress,
      reference: lastRef,
    })
  } catch (error) {
    console.error('Error looking up customer:', error)
    return NextResponse.json({ found: false }, { status: 500 })
  }
}
