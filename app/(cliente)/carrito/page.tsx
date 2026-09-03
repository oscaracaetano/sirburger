'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/utils'

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, totalCount } =
    useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
          🛒
        </div>
        <h1 className="text-2xl font-black text-gray-900">Tu carrito está vacío</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
          Parece que todavía no agregaste ninguna hamburguesa o acompañamiento a tu pedido.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-3.5 rounded-xl shadow-md transition transform active:scale-98 text-base"
          >
            <span>🍔</span> Explorar el Menú
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation & Back to Menu Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-amber-700 hover:text-amber-800 transition bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs"
        >
          <span>←</span> Volver al Menú (Seguir eligiendo)
        </Link>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
        >
          Vaciar carrito
        </button>
      </div>

      {/* Cart Title & Item Count */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Tu Carrito</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} {totalCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}
          </p>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-200 flex flex-col sm:flex-row justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-extrabold text-gray-900 text-lg">
                  {item.productName}
                </h3>
                <span className="font-extrabold text-gray-900 text-base sm:hidden">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>

              {/* Modifiers display */}
              {item.modifiers.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {item.modifiers.map((mod, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>
                        • {mod.name} {mod.qty > 1 ? `(x${mod.qty})` : ''}
                      </span>
                      {mod.priceDelta > 0 && (
                        <span className="text-amber-700 font-semibold">
                          +{formatCurrency(mod.priceDelta * mod.qty)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {item.notes && (
                <p className="text-xs text-amber-800 bg-amber-50/70 p-2 rounded-lg mt-2 italic">
                  📝 {item.notes}
                </p>
              )}

              <div className="mt-2 text-xs text-gray-400">
                Precio unitario: {formatCurrency(item.unitPrice)}
              </div>
            </div>

            {/* Quantity controls & total */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
              <span className="font-extrabold text-gray-900 text-lg hidden sm:block">
                {formatCurrency(item.unitPrice * item.quantity)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-sm text-gray-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 font-bold cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  title="Eliminar producto"
                  className="ml-2 text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary & Checkout Card */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg border-b pb-2">
          Resumen del Pedido
        </h3>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Costo de Envío (Delivery)</span>
          <span className="text-green-700 font-bold">¡GRATIS! 🎉</span>
        </div>

        <div className="border-t pt-3 flex justify-between items-center text-xl font-black text-gray-900">
          <span>Total a Pagar</span>
          <span className="text-amber-600 text-2xl">{formatCurrency(subtotal)}</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-3.5 px-4 rounded-xl transition text-center text-sm flex items-center justify-center gap-1.5"
          >
            <span>🍔</span> Seguir agregando al menú
          </Link>

          <Link
            href="/checkout"
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 px-6 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base active:scale-98 text-center"
          >
            <span>Confirmar Datos y Pedir</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
