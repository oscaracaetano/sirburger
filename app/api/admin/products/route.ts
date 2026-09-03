import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      include: {
        category: true,
        recipeItems: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    const payload = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      photoUrl: p.photoUrl,
      basePrice: Number(p.basePrice),
      categoryId: p.categoryId,
      categoryName: p.category.name,
      prepTimeMin: p.prepTimeMin,
      featured: p.featured,
      isSoldOut: p.isSoldOut,
      active: p.active,
      recipeItems: p.recipeItems.map((r) => ({
        id: r.id,
        ingredientId: r.ingredientId,
        ingredientName: r.ingredient.name,
        ingredientUnit: r.ingredient.unit,
        quantity: Number(r.quantity),
      })),
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching admin products:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      photoUrl,
      basePrice,
      categoryId,
      prepTimeMin,
      featured,
      active,
      isSoldOut,
      recipeItems,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'La categoría es obligatoria' }, { status: 400 })
    }

    const price = parseFloat(basePrice) || 0
    const prep = parseInt(prepTimeMin, 10) || 5

    const product = await db.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        basePrice: price,
        categoryId,
        prepTimeMin: prep,
        featured: Boolean(featured),
        active: active !== undefined ? Boolean(active) : true,
        isSoldOut: Boolean(isSoldOut),
        recipeItems: {
          create: (recipeItems || []).map(
            (r: { ingredientId: string; quantity: number }) => ({
              ingredientId: r.ingredientId,
              quantity: r.quantity,
            })
          ),
        },
      },
      include: {
        category: true,
        recipeItems: { include: { ingredient: true } },
      },
    })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Error al crear el producto' }, { status: 500 })
  }
}
