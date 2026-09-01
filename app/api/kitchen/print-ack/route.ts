import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = process.env.PRINT_AGENT_TOKEN || 'token-sirburger-impresion-local-dev'

    if (authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId } = body as { orderId: string }

    if (!orderId) {
      return NextResponse.json({ error: 'Falta orderId' }, { status: 400 })
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { printedAt: new Date() },
    })

    return NextResponse.json({ success: true, printedAt: updated.printedAt })
  } catch (error) {
    console.error('Error acknowledging print:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
