import { NextResponse } from 'next/server'
import { testPrintQueue } from '@/lib/test-printer-queue'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    testPrintQueue.add()
    return NextResponse.json({
      success: true,
      message: 'Ticket de prueba encolado. El agente de cocina lo imprimirá de inmediato.',
    })
  } catch (error) {
    console.error('Error queuing test print:', error)
    return NextResponse.json(
      { error: 'Error al solicitar impresión de prueba' },
      { status: 500 }
    )
  }
}
