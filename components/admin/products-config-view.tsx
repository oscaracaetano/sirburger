'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface RecipeItemData {
  id?: string
  ingredientId: string
  ingredientName?: string
  ingredientUnit?: string
  quantity: number
}

export interface AdminProductItem {
  id: string
  name: string
  description: string | null
  photoUrl: string | null
  basePrice: number
  categoryId: string
  categoryName: string
  prepTimeMin: number
  featured: boolean
  isSoldOut: boolean
  active: boolean
  recipeItems: RecipeItemData[]
}

export interface CategoryData {
  id: string
  name: string
}

export interface IngredientData {
  id: string
  name: string
  unit: string
}

const PRESET_PHOTOS = [
  { label: '🍔 Clásica', url: '/img/hamburguesa-clasica.jpg' },
  { label: '🥓 Doble Bacon', url: '/img/hamburguesa-doble.jpg' },
  { label: '🍟 Papas Fritas', url: '/img/papas-fritas.jpg' },
  { label: '🧅 Aros Cebolla', url: '/img/aros-cebolla.jpg' },
  { label: '🥤 Bebida', url: '/img/bebida.jpg' },
]

export function ProductsConfigView({
  initialProducts,
  categories,
  allIngredients,
}: {
  initialProducts: AdminProductItem[]
  categories: CategoryData[]
  allIngredients: IngredientData[]
}) {
  const { data: products = initialProducts, mutate: mutateProducts } = useSWR<AdminProductItem[]>(
    '/api/admin/products',
    fetcher,
    { fallbackData: initialProducts }
  )

  const { data: ingredients = allIngredients, mutate: mutateIngredients } = useSWR<IngredientData[]>(
    '/api/admin/ingredients',
    fetcher,
    { fallbackData: allIngredients }
  )

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  // Edit / Create Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [formBasePrice, setFormBasePrice] = useState<number>(4500)
  const [formCategoryId, setFormCategoryId] = useState<string>(categories[0]?.id || '')
  const [formPrepTimeMin, setFormPrepTimeMin] = useState<number>(8)
  const [formFeatured, setFormFeatured] = useState(false)
  const [formActive, setFormActive] = useState(true)
  const [formIsSoldOut, setFormIsSoldOut] = useState(false)
  const [formRecipe, setFormRecipe] = useState<RecipeItemData[]>([])

  // New Ingredient Modal State
  const [isNewIngredientModalOpen, setIsNewIngredientModalOpen] = useState(false)
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientUnit, setNewIngredientUnit] = useState('g')
  const [isSavingIngredient, setIsSavingIngredient] = useState(false)

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsCreatingNew(true)
    setEditingProductId(null)
    setFormName('')
    setFormDescription('')
    setFormPhotoUrl('')
    setFormBasePrice(4500)
    setFormCategoryId(categories[0]?.id || '')
    setFormPrepTimeMin(8)
    setFormFeatured(false)
    setFormActive(true)
    setFormIsSoldOut(false)
    setFormRecipe([])
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (p: AdminProductItem) => {
    setIsCreatingNew(false)
    setEditingProductId(p.id)
    setFormName(p.name)
    setFormDescription(p.description || '')
    setFormPhotoUrl(p.photoUrl || '')
    setFormBasePrice(p.basePrice)
    setFormCategoryId(p.categoryId)
    setFormPrepTimeMin(p.prepTimeMin)
    setFormFeatured(p.featured)
    setFormActive(p.active)
    setFormIsSoldOut(p.isSoldOut)
    setFormRecipe(
      p.recipeItems.map((r) => ({
        ingredientId: r.ingredientId,
        ingredientName: r.ingredientName,
        ingredientUnit: r.ingredientUnit,
        quantity: r.quantity,
      }))
    )
    setIsModalOpen(true)
  }

  // Toggle Sold Out (Agotado)
  const handleToggleSoldOut = async (product: AdminProductItem) => {
    setLoadingId(product.id)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSoldOut: !product.isSoldOut }),
      })
      if (!res.ok) throw new Error('Error al actualizar disponibilidad')
      await mutateProducts()
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setLoadingId(null)
    }
  }

  // Toggle Active (Fuera de Menú)
  const handleToggleActive = async (product: AdminProductItem) => {
    setLoadingId(product.id)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado en menú')
      await mutateProducts()
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setLoadingId(null)
    }
  }

  // Add Ingredient to Recipe in Form
  const handleAddRecipeItem = () => {
    if (ingredients.length === 0) {
      setIsNewIngredientModalOpen(true)
      return
    }
    const defaultIng = ingredients[0]
    setFormRecipe((prev) => [
      ...prev,
      {
        ingredientId: defaultIng.id,
        ingredientName: defaultIng.name,
        ingredientUnit: defaultIng.unit,
        quantity: 1,
      },
    ])
  }

  const handleUpdateRecipeItem = (index: number, ingredientId: string, quantity: number) => {
    const ing = ingredients.find((i) => i.id === ingredientId)
    setFormRecipe((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ingredientId,
              ingredientName: ing?.name || '',
              ingredientUnit: ing?.unit || 'u',
              quantity,
            }
          : item
      )
    )
  }

  const handleRemoveRecipeItem = (index: number) => {
    setFormRecipe((prev) => prev.filter((_, i) => i !== index))
  }

  // Save New Ingredient
  const handleSaveNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIngredientName.trim()) return

    setIsSavingIngredient(true)
    try {
      const res = await fetch('/api/admin/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIngredientName.trim(),
          unit: newIngredientUnit.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear ingrediente')

      await mutateIngredients()
      setIsNewIngredientModalOpen(false)
      setNewIngredientName('')

      // If form is open, automatically add the newly created ingredient
      if (isModalOpen && data.ingredient) {
        setFormRecipe((prev) => [
          ...prev,
          {
            ingredientId: data.ingredient.id,
            ingredientName: data.ingredient.name,
            ingredientUnit: data.ingredient.unit,
            quantity: 1,
          },
        ])
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error'
      alert('Error: ' + message)
    } finally {
      setIsSavingIngredient(false)
    }
  }

  // Save Product & Recipe Form
  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      alert('El nombre es obligatorio.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        photoUrl: formPhotoUrl.trim() || null,
        basePrice: formBasePrice,
        categoryId: formCategoryId,
        prepTimeMin: formPrepTimeMin,
        featured: formFeatured,
        active: formActive,
        isSoldOut: formIsSoldOut,
        recipeItems: formRecipe.map((r) => ({
          ingredientId: r.ingredientId,
          quantity: r.quantity,
        })),
      }

      let res: Response
      if (isCreatingNew) {
        res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else if (editingProductId) {
        res = await fetch(`/api/admin/products/${editingProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar el producto')

      setIsModalOpen(false)
      await mutateProducts()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error'
      alert('Error: ' + message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'ALL') return true
    return p.categoryId === selectedCategory
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Subtabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              Menú y Escandallo de Recetas (§23)
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Administrá productos, fotos, disponibilidad, fuera de menú y el escandallo de ingredientes para cálculo de consumos diarios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewIngredientModalOpen(true)}
              className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <span>🥕</span> Insumos / Ingredientes
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 text-sm cursor-pointer"
            >
              <span>➕</span> Nuevo Producto
            </button>
          </div>
        </div>

        {/* Subtabs Navigation */}
        <div className="flex gap-2 border-b border-gray-200 mt-5">
          <Link
            href="/admin/configuracion/productos"
            className="px-4 py-2.5 font-black text-sm text-amber-700 border-b-2 border-amber-600"
          >
            🍔 Menú y Recetas
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
          <Link
            href="/admin/configuracion/impresora"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            🖨️ Impresora de Tickets
          </Link>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Todos ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.map((product) => {
          const isExpanded = expandedProductId === product.id

          return (
            <div
              key={product.id}
              className={`bg-white rounded-3xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                !product.active
                  ? 'border-gray-300 bg-gray-50/80 opacity-75'
                  : product.isSoldOut
                  ? 'border-red-200 bg-red-50/20'
                  : 'border-gray-200 hover:shadow-md'
              }`}
            >
              {/* Product Header Card */}
              <div
                onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                className="p-5 cursor-pointer select-none space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Photo preview or avatar */}
                    {product.photoUrl ? (
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-900 font-black text-2xl flex items-center justify-center border-2 border-amber-200 shadow-xs shrink-0">
                        🍔
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          {product.categoryName}
                        </span>
                        {product.featured && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            ⭐ Destacado
                          </span>
                        )}
                        {!product.active && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-200 text-gray-700">
                            🚫 Fuera de Menú
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-gray-900 text-lg leading-tight mt-0.5">
                        {product.name}
                      </h3>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-black text-amber-700">
                          {formatCurrency(product.basePrice)}
                        </span>
                        <span className="text-xs text-gray-400">· ⏱️ {product.prepTimeMin} min prep</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {product.isSoldOut ? (
                      <span className="inline-block text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                        🔴 Agotado
                      </span>
                    ) : product.active ? (
                      <span className="inline-block text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                        🟢 Disponible
                      </span>
                    ) : null}
                  </div>
                </div>

                {product.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                )}

                {/* Recipe Preview Chips */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-400 text-[11px] uppercase">
                      Insumos ({product.recipeItems.length}):
                    </span>
                    {product.recipeItems.length === 0 ? (
                      <span className="text-[11px] text-gray-400 italic">Sin escandallo asignado</span>
                    ) : (
                      product.recipeItems.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md text-[11px]"
                        >
                          {r.ingredientName}: {r.quantity} {r.ingredientUnit}
                        </span>
                      ))
                    )}
                    {product.recipeItems.length > 3 && (
                      <span className="text-[11px] text-amber-700 font-bold">
                        +{product.recipeItems.length - 3} más
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-amber-700 hover:underline">
                    {isExpanded ? 'Ocultar ▲' : 'Ver Ficha ▼'}
                  </span>
                </div>
              </div>

              {/* Expanded Detailed Recipe Escandallo */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 bg-amber-50/30 border-t border-amber-100/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <span>🥩</span> Escandallo de Ingredientes (Consumo Diario)
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(product)}
                      className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      Editar Receta ✏️
                    </button>
                  </div>

                  {product.recipeItems.length === 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-dashed border-gray-300 text-center text-xs text-gray-400">
                      No se cargaron ingredientes en la receta de este producto.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {product.recipeItems.map((r, i) => (
                        <div
                          key={i}
                          className="bg-white p-2.5 rounded-xl border border-gray-200 flex justify-between items-center shadow-2xs"
                        >
                          <span className="font-bold text-gray-800">{r.ingredientName}</span>
                          <span className="font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {r.quantity} {r.ingredientUnit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400">
                    💡 Estos insumos se deducirán automáticamente en el cálculo de consumo diario por cada porción vendida.
                  </p>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loadingId === product.id}
                    onClick={() => handleToggleSoldOut(product)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                      product.isSoldOut
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                        : 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                    }`}
                    title={product.isSoldOut ? 'Habilitar producto hoy' : 'Marcar como agotado hoy'}
                  >
                    {product.isSoldOut ? '🟢 Habilitar' : '🔴 Agotar'}
                  </button>

                  <button
                    type="button"
                    disabled={loadingId === product.id}
                    onClick={() => handleToggleActive(product)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                      product.active
                        ? 'bg-white hover:bg-gray-100 text-gray-600 border-gray-300'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
                    }`}
                    title={product.active ? 'Quitar del menú público' : 'Activar en menú público'}
                  >
                    {product.active ? '🚫 Quitar de Menú' : '📋 Poner en Menú'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(product)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span>✏️</span> Editar Ficha
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Create / Edit Product & Recipe */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProductForm}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-5 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span>🍔</span> {isCreatingNew ? 'Nuevo Producto y Receta' : `Editar: ${formName}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Basic Info */}
            <div className="space-y-3.5 text-xs font-bold text-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Nombre del Producto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Doble Cheddar Bacon"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Precio Base ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Tiempo de Prep. (Minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPrepTimeMin}
                    onChange={(e) => setFormPrepTimeMin(parseInt(e.target.value, 10) || 5)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Photo Upload / URL & Presets */}
              <div>
                <label className="block uppercase tracking-wider text-gray-500 mb-1">
                  Foto del Producto (URL o Imagen)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    placeholder="Ej: /img/hamburguesa-doble.jpg o https://..."
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-mono text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {formPhotoUrl && (
                    <img
                      src={formPhotoUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-xl object-cover border border-amber-300 shadow-2xs"
                    />
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-bold">Sugerencias:</span>
                  {PRESET_PHOTOS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormPhotoUrl(p.url)}
                      className="text-[10px] bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded-md transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-gray-500 mb-1">
                  Descripción del Producto
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ej: Doble medallón de carne 120g con cuádruple cheddar..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Checkbox Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 accent-amber-600"
                  />
                  <span className="text-xs font-bold text-gray-800">📋 Activo en Menú</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 accent-amber-600"
                  />
                  <span className="text-xs font-bold text-gray-800">⭐ Destacado</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsSoldOut}
                    onChange={(e) => setFormIsSoldOut(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 accent-red-600"
                  />
                  <span className="text-xs font-bold text-red-700">🔴 Agotado hoy</span>
                </label>
              </div>

              {/* Recipe / Escandallo Section */}
              <div className="pt-3 border-t border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      <span>🥩</span> Escandallo de Ingredientes y Consumos
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      Insumos que componen este producto para el cálculo de consumo diario.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewIngredientModalOpen(true)}
                      className="text-xs text-gray-600 hover:text-gray-900 font-bold hover:underline cursor-pointer"
                    >
                      + Nuevo Insumo
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRecipeItem}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>➕</span> Añadir a Receta
                    </button>
                  </div>
                </div>

                {formRecipe.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-400">
                    No se han asignado ingredientes a esta receta. Hacé clic en <strong>Añadir a Receta</strong>.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                    {formRecipe.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 p-2.5 rounded-2xl border border-gray-200 flex items-center justify-between gap-3 text-xs"
                      >
                        {/* Ingredient Select */}
                        <div className="flex-1">
                          <select
                            value={item.ingredientId}
                            onChange={(e) =>
                              handleUpdateRecipeItem(idx, e.target.value, item.quantity)
                            }
                            className="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity input */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateRecipeItem(
                                idx,
                                item.ingredientId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 bg-white border border-gray-300 rounded-xl p-2 font-black text-right text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="font-bold text-gray-500 w-8">
                            {item.ingredientUnit || 'u'}
                          </span>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeItem(idx)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Quitar de la receta"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : '💾 Guardar Producto y Receta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create New Ingredient */}
      {isNewIngredientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveNewIngredient}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <span>🥕</span> Alta de Insumo / Ingrediente
              </h3>
              <button
                type="button"
                onClick={() => setIsNewIngredientModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-gray-700">
              <div>
                <label className="block uppercase tracking-wider text-gray-500 mb-1">
                  Nombre del Insumo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="Ej: Pan de Papa / Queso Cheddar"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-gray-500 mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="g">Gramos (g)</option>
                  <option value="u">Unidades (u)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="porción">Porción</option>
                  <option value="kg">Kilogramos (kg)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewIngredientModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingIngredient}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSavingIngredient ? 'Guardando...' : 'Crear Insumo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
