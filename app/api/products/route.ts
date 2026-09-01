import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { active: true },
      include: {
        category: true,
        modifierGroups: {
          include: {
            options: true,
          },
        },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching catalog products:', error)
    return NextResponse.json(
      { error: 'Error al obtener catálogo de productos' },
      { status: 500 }
    )
  }
}
