import { db } from '@/lib/db'
import { ProductsConfigView } from '@/components/admin/products-config-view'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionProductosPage() {
  const [products, categories, ingredients] = await Promise.all([
    db.product.findMany({
      include: {
        category: true,
        recipeItems: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.ingredient.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  const formattedProducts = products.map((p) => ({
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

  const formattedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
  }))

  const formattedIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
  }))

  return (
    <ProductsConfigView
      initialProducts={formattedProducts}
      categories={formattedCategories}
      allIngredients={formattedIngredients}
    />
  )
}
