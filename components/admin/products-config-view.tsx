'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface ProductConfigItem {
  id: string
  name: string
  categoryName: string
  basePrice: number
  isSoldOut: boolean
}

export function ProductsConfigView({ initialProducts }: { initialProducts: ProductConfigItem[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleToggle = async (id: string) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/products/${id}/toggle-sold-out`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al actualizar disponibilidad')

      const updated = await res.json()
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isSoldOut: updated.isSoldOut } : p))
      )
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Configuración del Sistema
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Marcá productos como AGOTADOS con un solo clic para bloquearlos instantáneamente en el menú del cliente.
        </p>

        {/* Configuration Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mt-4">
          <Link
            href="/admin/configuracion/productos"
            className="px-4 py-2.5 font-black text-sm text-amber-700 border-b-2 border-amber-600"
          >
            🍔 Menú y Agotados
          </Link>
          <Link
            href="/admin/configuracion/horarios"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            ⏰ Horarios de Atención
          </Link>
          <Link
            href="/admin/configuracion/repartidores"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            🛵 Repartidores
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {products.map((product) => (
            <div
              key={product.id}
              className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition ${
                product.isSoldOut ? 'bg-red-50/40' : 'hover:bg-gray-50/50'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {product.categoryName}
                </span>
                <h3 className="font-extrabold text-gray-900 text-base">
                  {product.name}
                </h3>
                <span className="text-sm font-semibold text-amber-700">
                  {formatCurrency(product.basePrice)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {product.isSoldOut ? (
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
                    🔴 AGOTADO
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                    🟢 DISPONIBLE
                  </span>
                )}

                <button
                  type="button"
                  disabled={loadingId === product.id}
                  onClick={() => handleToggle(product.id)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
                    product.isSoldOut
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                      : 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                  }`}
                >
                  {loadingId === product.id
                    ? 'Actualizando...'
                    : product.isSoldOut
                    ? 'Habilitar'
                    : 'Marcar Agotado'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
