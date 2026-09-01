import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const hours = await db.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    })

    return NextResponse.json(hours)
  } catch (error) {
    console.error('Error fetching business hours:', error)
    return NextResponse.json(
      { error: 'Error al obtener horarios' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { hours } = body as {
      hours: Array<{
        dayOfWeek: number
        openTime: string
        closeTime: string
        isClosed: boolean
      }>
    }

    if (!hours || !Array.isArray(hours)) {
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }

    // Update each day of the week in a transaction
    await db.$transaction(
      hours.map((h) =>
        db.businessHours.upsert({
          where: { id: (h as { id?: string }).id || `day-${h.dayOfWeek}` },
          create: {
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime || '19:00',
            closeTime: h.closeTime || '00:00',
            isClosed: Boolean(h.isClosed),
          },
          update: {
            openTime: h.openTime || '19:00',
            closeTime: h.closeTime || '00:00',
            isClosed: Boolean(h.isClosed),
          },
        })
      )
    )

    const updatedHours = await db.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    })

    return NextResponse.json({ success: true, hours: updatedHours })
  } catch (error) {
    console.error('Error updating business hours:', error)
    return NextResponse.json(
      { error: 'Error al actualizar los horarios' },
      { status: 500 }
    )
  }
}
