import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const couriers = await db.courier.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json(couriers)
  } catch (error) {
    console.error('Error fetching admin couriers:', error)
    return NextResponse.json({ error: 'Error al obtener repartidores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, cardCode, vehicle, plate, company, photoUrl, active } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Auto-generate cardCode if not provided
    let finalCardCode = cardCode?.trim()
    if (!finalCardCode) {
      const count = await db.courier.count()
      finalCardCode = `REP-${String(count + 1).padStart(3, '0')}`
    }

    // Check if cardCode already exists
    const existing = await db.courier.findUnique({ where: { cardCode: finalCardCode } })
    if (existing) {
      return NextResponse.json(
        { error: `El código de tarjeta ${finalCardCode} ya está en uso.` },
        { status: 400 }
      )
    }

    const courier = await db.courier.create({
      data: {
        name: name.trim(),
        cardCode: finalCardCode,
        phone: phone?.trim() || null,
        vehicle: vehicle?.trim() || null,
        plate: plate?.trim() || null,
        company: company || 'PROPIO',
        photoUrl: photoUrl?.trim() || null,
        active: active !== undefined ? Boolean(active) : true,
      },
    })

    return NextResponse.json({ success: true, courier })
  } catch (error) {
    console.error('Error creating courier:', error)
    return NextResponse.json({ error: 'Error al crear el repartidor' }, { status: 500 })
  }
}
