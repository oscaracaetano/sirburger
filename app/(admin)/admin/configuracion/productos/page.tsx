import { db } from '@/lib/db'
import { ProductsConfigView } from '@/components/admin/products-config-view'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionProductosPage() {
  const products = await db.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  })

  const formattedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    basePrice: Number(p.basePrice),
    isSoldOut: p.isSoldOut,
  }))

  return <ProductsConfigView initialProducts={formattedProducts} />
}
