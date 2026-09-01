import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await db.product.findUniqueOrThrow({ where: { id } })

    const updated = await db.product.update({
      where: { id },
      data: { isSoldOut: !product.isSoldOut },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error toggling sold out status:', error)
    return NextResponse.json(
      { error: 'Error al cambiar estado de disponibilidad' },
      { status: 500 }
    )
  }
}
