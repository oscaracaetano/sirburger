'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart, CartModifier } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/utils'

interface ModifierOptionData {
  id: string
  name: string
  priceDelta: number
  isSoldOut: boolean
  maxQty: number | null
}

interface ModifierGroupData {
  id: string
  name: string
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'QUANTITY'
  minSelect: number
  maxSelect: number | null
  options: ModifierOptionData[]
}

interface ProductCustomizerProps {
  product: {
    id: string
    name: string
    description: string | null
    basePrice: number
    isSoldOut: boolean
    categoryName: string
    modifierGroups: ModifierGroupData[]
  }
  isStoreOpen: boolean
}

export function ProductCustomizer({ product, isStoreOpen }: ProductCustomizerProps) {
  const router = useRouter()
  const { addItem } = useCart()

  // State for single choice groups (group id -> selected option id)
  const [singleChoices, setSingleChoices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.modifierGroups.forEach((group) => {
      if (group.type === 'SINGLE_CHOICE' && group.options.length > 0) {
        const firstAvailable = group.options.find((o) => !o.isSoldOut)
        if (firstAvailable) {
          initial[group.id] = firstAvailable.id
        }
      }
    })
    return initial
  })

  // State for multi choice groups (group id -> Set of option ids)
  const [multiChoices, setMultiChoices] = useState<Record<string, string[]>>({})

  // State for quantity modifiers (option id -> qty)
  const [quantityModifiers, setQuantityModifiers] = useState<Record<string, number>>({})

  // Notes & item quantity
  const [notes, setNotes] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [addedSuccess, setAddedSuccess] = useState(false)

  // Calculate Unit Price
  let modifiersPriceDelta = 0
  const selectedModifiersList: CartModifier[] = []

  // 1. Single choices
  product.modifierGroups.forEach((group) => {
    if (group.type === 'SINGLE_CHOICE') {
      const selectedOptionId = singleChoices[group.id]
      const opt = group.options.find((o) => o.id === selectedOptionId)
      if (opt) {
        modifiersPriceDelta += opt.priceDelta
        if (opt.priceDelta !== 0 || opt.name) {
          selectedModifiersList.push({
            optionId: opt.id,
            name: `${group.name}: ${opt.name}`,
            priceDelta: opt.priceDelta,
            qty: 1,
          })
        }
      }
    }
  })

  // 2. Multi choices
  product.modifierGroups.forEach((group) => {
    if (group.type === 'MULTI_CHOICE') {
      const selectedIds = multiChoices[group.id] || []
      selectedIds.forEach((optId) => {
        const opt = group.options.find((o) => o.id === optId)
        if (opt) {
          modifiersPriceDelta += opt.priceDelta
          selectedModifiersList.push({
            optionId: opt.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            qty: 1,
          })
        }
      })
    }
  })

  // 3. Quantity modifiers
  product.modifierGroups.forEach((group) => {
    if (group.type === 'QUANTITY') {
      group.options.forEach((opt) => {
        const qty = quantityModifiers[opt.id] || 0
        if (qty > 0) {
          modifiersPriceDelta += opt.priceDelta * qty
          selectedModifiersList.push({
            optionId: opt.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            qty,
          })
        }
      })
    }
  })

  const unitPrice = product.basePrice + modifiersPriceDelta
  const totalPrice = unitPrice * itemQuantity

  const handleAddToCart = () => {
    if (product.isSoldOut || !isStoreOpen) return

    addItem({
      productId: product.id,
      productName: product.name,
      basePrice: product.basePrice,
      unitPrice,
      quantity: itemQuantity,
      modifiers: selectedModifiersList,
      notes: notes.trim() || undefined,
    })

    setAddedSuccess(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Product Hero */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
        <span className="text-xs uppercase font-bold tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
          {product.categoryName}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black mt-2">{product.name}</h1>
        {product.description && (
          <p className="text-amber-100 text-sm mt-1 max-w-xl">{product.description}</p>
        )}
        <div className="mt-4 text-2xl font-extrabold">
          {formatCurrency(product.basePrice)}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Availability warning */}
        {(!isStoreOpen || product.isSoldOut) && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {product.isSoldOut
                ? 'Este producto se encuentra temporalmente agotado.'
                : 'El local está cerrado en este momento. Podés ver las opciones pero no realizar pedidos.'}
            </span>
          </div>
        )}

        {/* Modifier Groups */}
        {product.modifierGroups.map((group) => (
          <div key={group.id} className="border-b border-gray-100 pb-6 last:border-b-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <span>{group.name}</span>
                {group.minSelect > 0 && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    Requerido
                  </span>
                )}
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                {group.type === 'SINGLE_CHOICE' && 'Elegí 1 opción'}
                {group.type === 'MULTI_CHOICE' && 'Selección múltiple'}
                {group.type === 'QUANTITY' && 'Opcional'}
              </span>
            </div>

            {/* SINGLE CHOICE (Radio) */}
            {group.type === 'SINGLE_CHOICE' && (
              <div className="space-y-2">
                {group.options.map((opt) => {
                  const isSelected = singleChoices[group.id] === opt.id
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-medium'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${opt.isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`group-${group.id}`}
                          value={opt.id}
                          checked={isSelected}
                          disabled={opt.isSoldOut}
                          onChange={() =>
                            setSingleChoices((prev) => ({ ...prev, [group.id]: opt.id }))
                          }
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500 accent-amber-600"
                        />
                        <span>{opt.name}</span>
                        {opt.isSoldOut && (
                          <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            Agotado
                          </span>
                        )}
                      </div>
                      {opt.priceDelta !== 0 && (
                        <span className="text-sm font-semibold text-gray-700">
                          {opt.priceDelta > 0 ? '+' : ''}
                          {formatCurrency(opt.priceDelta)}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}

            {/* MULTI CHOICE (Checkboxes, e.g. "Sin lechuga") */}
            {group.type === 'MULTI_CHOICE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const currentSelected = multiChoices[group.id] || []
                  const isChecked = currentSelected.includes(opt.id)

                  const toggleCheck = () => {
                    if (opt.isSoldOut) return
                    setMultiChoices((prev) => {
                      const list = prev[group.id] || []
                      const next = isChecked
                        ? list.filter((id) => id !== opt.id)
                        : [...list, opt.id]
                      return { ...prev, [group.id]: next }
                    })
                  }

                  return (
                    <label
                      key={opt.id}
                      onClick={toggleCheck}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'border-amber-600 bg-amber-50/40 text-amber-950 font-medium'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${opt.isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={opt.isSoldOut}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                        />
                        <span className="text-sm">{opt.name}</span>
                      </div>
                      {opt.priceDelta !== 0 && (
                        <span className="text-xs font-semibold text-gray-700">
                          {opt.priceDelta > 0 ? '+' : ''}
                          {formatCurrency(opt.priceDelta)}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}

            {/* QUANTITY (+ / - Extras) */}
            {group.type === 'QUANTITY' && (
              <div className="space-y-2">
                {group.options.map((opt) => {
                  const currentQty = quantityModifiers[opt.id] || 0
                  const maxQty = opt.maxQty || 5

                  const handleIncrement = () => {
                    if (opt.isSoldOut || currentQty >= maxQty) return
                    setQuantityModifiers((prev) => ({
                      ...prev,
                      [opt.id]: currentQty + 1,
                    }))
                  }

                  const handleDecrement = () => {
                    if (currentQty <= 0) return
                    setQuantityModifiers((prev) => ({
                      ...prev,
                      [opt.id]: currentQty - 1,
                    }))
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        currentQty > 0
                          ? 'border-amber-400 bg-amber-50/30'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-800">{opt.name}</span>
                        <div className="text-xs text-amber-700 font-semibold">
                          +{formatCurrency(opt.priceDelta)} c/u
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={currentQty === 0}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold text-gray-800 text-sm">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={currentQty >= maxQty || opt.isSoldOut}
                          className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Special Instructions */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Aclaraciones para la cocina (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Pan bien tostado, sin sal, etc."
            rows={2}
            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>

        {/* Quantity and Add to Cart Section */}
        <div className="bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-sm font-semibold text-gray-600">Cantidad:</span>
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-300 shadow-sm">
              <button
                type="button"
                onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                disabled={itemQuantity <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              >
                −
              </button>
              <span className="w-6 text-center font-extrabold text-gray-800">
                {itemQuantity}
              </span>
              <button
                type="button"
                onClick={() => setItemQuantity((q) => q + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-amber-600 hover:bg-amber-50"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isStoreOpen || product.isSoldOut}
            className="w-full sm:w-auto sm:flex-1 max-w-sm bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 px-6 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between text-base"
          >
            <span>Agregar al pedido</span>
            <span>{formatCurrency(totalPrice)}</span>
          </button>
        </div>

        {/* Modal / Toast when added */}
        {addedSuccess && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-3">
                ✓
              </div>
              <h3 className="text-xl font-extrabold text-gray-900">¡Producto agregado!</h3>
              <p className="text-sm text-gray-500 mt-1">
                {itemQuantity}x {product.name} ({formatCurrency(totalPrice)})
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                >
                  Seguir viendo
                </button>
                <Link
                  href="/carrito"
                  className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center"
                >
                  Ver Carrito →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
