import { db } from '@/lib/db'
import { getBusinessStatus } from '@/lib/business-hours'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const [categories, businessStatus] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    }),
    getBusinessStatus(),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Business status banner */}
      {!businessStatus.isOpen && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-red-800 font-semibold">🔒 Estamos cerrados</p>
          {businessStatus.message && (
            <p className="text-red-600 text-sm mt-1">{businessStatus.message}</p>
          )}
        </div>
      )}

      {businessStatus.isOpen && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-green-800 font-semibold">✅ ¡Estamos abiertos! Hacé tu pedido</p>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8 text-gray-800">Nuestro Menú</h1>

      {/* Featured products */}
      {(() => {
        const featured = categories.flatMap(c => c.products.filter(p => p.featured))
        if (featured.length === 0) return null
        return (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4 text-amber-700">⭐ Destacados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(product => (
                <Link
                  key={product.id}
                  href={`/producto/${product.id}`}
                  className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{product.name}</h3>
                      {product.description && (
                        <p className="text-gray-500 text-sm mt-1">{product.description}</p>
                      )}
                    </div>
                    <span className="text-amber-700 font-bold text-lg">
                      {formatCurrency(Number(product.basePrice))}
                    </span>
                  </div>
                  {product.isSoldOut && (
                    <span className="inline-block mt-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Agotado</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )
      })()}

      {/* Categories and products */}
      {categories.map(category => (
        <section key={category.id} className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
            {category.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.products.map(product => (
              <Link
                key={product.id}
                href={`/producto/${product.id}`}
                className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition ${
                  product.isSoldOut ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                    {product.description && (
                      <p className="text-gray-500 text-sm mt-1">{product.description}</p>
                    )}
                  </div>
                  <span className="text-amber-700 font-bold">
                    {formatCurrency(Number(product.basePrice))}
                  </span>
                </div>
                {product.isSoldOut && (
                  <span className="inline-block mt-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Agotado</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
