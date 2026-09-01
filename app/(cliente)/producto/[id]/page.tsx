import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getBusinessStatus } from '@/lib/business-hours'
import { ProductCustomizer } from '@/components/cliente/product-customizer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [product, businessStatus] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        category: true,
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    }),
    getBusinessStatus(),
  ])

  if (!product) return notFound()

  const formattedProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: Number(product.basePrice),
    isSoldOut: product.isSoldOut,
    categoryName: product.category.name,
    modifierGroups: product.modifierGroups.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: Number(o.priceDelta),
        isSoldOut: o.isSoldOut,
        maxQty: o.maxQty,
      })),
    })),
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800 mb-4 transition"
      >
        <span>←</span> Volver al menú
      </Link>

      <ProductCustomizer
        product={formattedProduct}
        isStoreOpen={businessStatus.isOpen}
      />
    </div>
  )
}
