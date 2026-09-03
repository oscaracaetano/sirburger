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

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Execute update in transaction
    const updated = await db.$transaction(async (tx) => {
      // If recipeItems are provided, replace them
      if (Array.isArray(recipeItems)) {
        await tx.recipeItem.deleteMany({ where: { productId: id } })
        if (recipeItems.length > 0) {
          await tx.recipeItem.createMany({
            data: recipeItems.map((r: { ingredientId: string; quantity: number }) => ({
              productId: id,
              ingredientId: r.ingredientId,
              quantity: r.quantity,
            })),
          })
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() || null } : {}),
          ...(photoUrl !== undefined ? { photoUrl: photoUrl?.trim() || null } : {}),
          ...(basePrice !== undefined ? { basePrice: parseFloat(basePrice) || 0 } : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
          ...(prepTimeMin !== undefined ? { prepTimeMin: parseInt(prepTimeMin, 10) || 5 } : {}),
          ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
          ...(active !== undefined ? { active: Boolean(active) } : {}),
          ...(isSoldOut !== undefined ? { isSoldOut: Boolean(isSoldOut) } : {}),
        },
        include: {
          category: true,
          recipeItems: { include: { ingredient: true } },
        },
      })
    })

    return NextResponse.json({ success: true, product: updated })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Error al actualizar el producto' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if product was used in orders
    const orderItemsCount = await db.orderItem.count({ where: { productId: id } })

    if (orderItemsCount > 0) {
      // Soft-delete by setting active = false (Fuera de Menú)
      const updated = await db.product.update({
        where: { id },
        data: { active: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Producto marcado como fuera de menú (tiene pedidos históricos asociados)',
        product: updated,
      })
    }

    // Otherwise remove recipe items and product
    await db.recipeItem.deleteMany({ where: { productId: id } })
    await db.product.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Producto eliminado' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Error al eliminar el producto' }, { status: 500 })
  }
}
