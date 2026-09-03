import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ingredients = await db.ingredient.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(ingredients)
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    return NextResponse.json({ error: 'Error al obtener ingredientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit } = body as { name: string; unit?: string }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del ingrediente es obligatorio' }, { status: 400 })
    }

    const ingredient = await db.ingredient.create({
      data: {
        name: name.trim(),
        unit: unit?.trim() || 'u',
      },
    })

    return NextResponse.json({ success: true, ingredient })
  } catch (error) {
    console.error('Error creating ingredient:', error)
    return NextResponse.json({ error: 'Error al crear el ingrediente' }, { status: 500 })
  }
}
