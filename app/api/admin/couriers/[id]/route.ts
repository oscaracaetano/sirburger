import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, cardCode, vehicle, plate, company, photoUrl, active } = body

    const existing = await db.courier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 })
    }

    // If cardCode changed, ensure unique
    if (cardCode && cardCode.trim() !== existing.cardCode) {
      const duplicate = await db.courier.findUnique({
        where: { cardCode: cardCode.trim() },
      })
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `El código de tarjeta ${cardCode} ya está en uso por otro repartidor.` },
          { status: 400 }
        )
      }
    }

    const updated = await db.courier.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(cardCode !== undefined ? { cardCode: cardCode.trim() } : {}),
        ...(vehicle !== undefined ? { vehicle: vehicle?.trim() || null } : {}),
        ...(plate !== undefined ? { plate: plate?.trim() || null } : {}),
        ...(company !== undefined ? { company } : {}),
        ...(photoUrl !== undefined ? { photoUrl: photoUrl?.trim() || null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    })

    return NextResponse.json({ success: true, courier: updated })
  } catch (error) {
    console.error('Error updating courier:', error)
    return NextResponse.json({ error: 'Error al actualizar el repartidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if courier has dispatches
    const dispatchesCount = await db.dispatch.count({ where: { courierId: id } })
    if (dispatchesCount > 0) {
      // Soft-deactivate if has history
      const updated = await db.courier.update({
        where: { id },
        data: { active: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Repartidor desactivado (tiene historial de despachos)',
        courier: updated,
      })
    }

    await db.courier.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Repartidor eliminado' })
  } catch (error) {
    console.error('Error deleting courier:', error)
    return NextResponse.json({ error: 'Error al eliminar el repartidor' }, { status: 500 })
  }
}
