'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatTime, elapsedTime } from '@/lib/utils'
import { generateWhatsAppLink } from '@/lib/whatsapp'

interface StatusLogData {
  id: string
  status: string
  actor: string | null
  createdAt: string
}

interface OrderItemDetail {
  id?: string
  productId: string
  quantity: number
  unitPrice: number
  notes: string | null
  modifiers: Array<{ name: string; priceDelta: number; qty?: number }>
  product: {
    name: string
    basePrice: number
  }
}

interface CatalogProduct {
  id: string
  name: string
  basePrice: number
  category: { name: string }
}

interface OrderDetailProps {
  order: {
    id: string
    code: string
    status: string
    total: number
    paymentMethod: string
    deliveryAddress: string
    deliveryRef: string | null
    createdAt: string
    courier?: {
      id: string
      name: string
      cardCode: string
    } | null
    customer: {
      name: string | null
      phone: string
    }
    items: OrderItemDetail[]
    statusLogs: StatusLogData[]
  }
}

const STATUS_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  APROBADO: 'Aprobado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo para despacho',
  EN_CALLE: 'En calle (con repartidor)',
  ENTREGADO: 'Entregado',
  INTERVENCION: '⚠️ En Intervención',
  CANCELADO: 'Cancelado',
}

const COMMON_ISSUES = [
  {
    label: '🧀 Cheddar agotado',
    reason: 'Cheddar',
    template:
      'En este momento nos quedamos sin queso cheddar. ¿Te gustaría cambiarlo por muzzarella o queso tybo sin cargo?',
  },
  {
    label: '🥔 Papas fritas agotadas',
    reason: 'Papas fritas',
    template:
      'Por un momento no tenemos papas rústicas disponibles. ¿Podemos ofrecerte aros de cebolla crocantes en su lugar?',
  },
  {
    label: '🍞 Pan de papa agotado',
    reason: 'Pan de papa',
    template:
      'Nos quedamos sin pan de papa brioche. Tenemos pan artesanal de sésamo recién horneado, ¿te parece bien el cambio?',
  },
  {
    label: '⏳ Demora excepcional',
    reason: 'Demora',
    template:
      'Te contactamos para avisarte que la cocina tiene una demora extra de 15 minutos debido a la alta demanda. ¿Deseás continuar con el pedido?',
  },
  {
    label: '📝 Consulta sobre cambio de pedido',
    reason: 'Cambio',
    template:
      'Te contactamos de SirBurger para coordinar una modificación solicitada en tu pedido.',
  },
]

export function OrderDetailView({ order: initialOrder }: OrderDetailProps) {
  const router = useRouter()
  const [order, setOrder] = useState(initialOrder)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [isEditMode, setIsEditMode] = useState(initialOrder.status === 'INTERVENCION')
  const [showInterventionModal, setShowInterventionModal] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [whatsappText, setWhatsappText] = useState(
    `Hola ${order.customer.name || ''}! Te contactamos de SirBurger por tu pedido #${order.code}.`
  )

  // Editable Form State
  const [editableCustomerName, setEditableCustomerName] = useState(order.customer.name || '')
  const [editableCustomerPhone, setEditableCustomerPhone] = useState(order.customer.phone || '')
  const [editableAddress, setEditableAddress] = useState(order.deliveryAddress || '')
  const [editableRef, setEditableRef] = useState(order.deliveryRef || '')
  const [editablePaymentMethod, setEditablePaymentMethod] = useState(order.paymentMethod || 'EFECTIVO')
  const [editableItems, setEditableItems] = useState<OrderItemDetail[]>(order.items || [])

  // Catalog products for adding items
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [showAddProductModal, setShowAddProductModal] = useState(false)

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(
            data.map((p) => ({
              id: p.id,
              name: p.name,
              basePrice: Number(p.basePrice),
              category: { name: p.category?.name || 'Menú' },
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  // Determine if this order had already been in the kitchen
  const hadBeenInKitchen = order.statusLogs.some(
    (log) => log.status === 'EN_PREPARACION' || log.status === 'LISTO'
  )
  const isPriority = hadBeenInKitchen && order.statusLogs.some((log) => log.status === 'INTERVENCION')

  const handleSelectIssue = (issue: (typeof COMMON_ISSUES)[0]) => {
    setSelectedIssue(issue.reason)
    setWhatsappText(
      `Hola ${editableCustomerName || ''}! Te contactamos de SirBurger por tu pedido #${order.code}.\n\n${issue.template}`
    )
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actor: 'operadora' }),
      })

      if (!res.ok) {
        throw new Error('Error al actualizar el estado')
      }

      router.refresh()
      // Reload order data
      const refreshed = await fetch(`/api/orders/${order.id}`).then((r) => r.json())
      if (refreshed && !refreshed.error) {
        setOrder({
          ...refreshed,
          total: Number(refreshed.total),
          items: refreshed.items.map((it: OrderItemDetail) => ({
            ...it,
            unitPrice: Number(it.unitPrice),
            product: { ...it.product, basePrice: Number(it.product.basePrice) },
          })),
        })
      }
    } catch (err) {
      alert('No se pudo actualizar el estado: ' + err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendToKitchen = async () => {
    setIsUpdating(true)
    try {
      // First ensure status is APROBADO then EN_PREPARACION
      await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APROBADO', actor: 'operadora' }),
      })

      await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EN_PREPARACION', actor: 'operadora' }),
      })

      router.push('/admin/pedidos')
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Calculate live editable total
  const calculatedTotal = editableItems.reduce((sum, item) => {
    const modifiersCost = (item.modifiers || []).reduce((mSum, m) => {
      const qty = m.qty || 1
      return mSum + Number(m.priceDelta) * qty
    }, 0)
    return sum + (Number(item.unitPrice) + modifiersCost) * item.quantity
  }, 0)

  // Item modification handlers
  const handleItemQtyChange = (index: number, delta: number) => {
    setEditableItems((prev) => {
      const copy = [...prev]
      const current = copy[index]
      const newQty = current.quantity + delta
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index)
      }
      copy[index] = { ...current, quantity: newQty }
      return copy
    })
  }

  const handleItemNoteChange = (index: number, notes: string) => {
    setEditableItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], notes }
      return copy
    })
  }

  const handleRemoveItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddProductFromCatalog = (product: CatalogProduct) => {
    setEditableItems((prev) => [
      ...prev,
      {
        productId: product.id,
        quantity: 1,
        unitPrice: product.basePrice,
        notes: null,
        modifiers: [],
        product: {
          name: product.name,
          basePrice: product.basePrice,
        },
      },
    ])
    setShowAddProductModal(false)
  }

  // Save all modifications to database
  const handleSaveChanges = async () => {
    if (editableItems.length === 0) {
      alert('El pedido debe tener al menos un producto.')
      return
    }

    setIsSavingChanges(true)
    try {
      const payload = {
        customerName: editableCustomerName,
        customerPhone: editableCustomerPhone,
        deliveryAddress: editableAddress,
        deliveryRef: editableRef,
        paymentMethod: editablePaymentMethod,
        items: editableItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          modifiers: it.modifiers || [],
          notes: it.notes || null,
        })),
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los cambios')
      }

      alert('✅ ¡Cambios del pedido guardados con éxito!')
      router.refresh()

      if (data.order) {
        setOrder({
          ...data.order,
          total: Number(data.order.total),
          items: data.order.items.map((it: OrderItemDetail) => ({
            ...it,
            unitPrice: Number(it.unitPrice),
            product: { ...it.product, basePrice: Number(it.product.basePrice) },
          })),
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      alert('Error: ' + message)
    } finally {
      setIsSavingChanges(false)
    }
  }

  // Save changes and immediately send to kitchen
  const handleSaveAndSendToKitchen = async () => {
    if (editableItems.length === 0) {
      alert('El pedido debe tener al menos un producto.')
      return
    }

    setIsSavingChanges(true)
    try {
      const payload = {
        customerName: editableCustomerName,
        customerPhone: editableCustomerPhone,
        deliveryAddress: editableAddress,
        deliveryRef: editableRef,
        paymentMethod: editablePaymentMethod,
        items: editableItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          modifiers: it.modifiers || [],
          notes: it.notes || null,
        })),
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los cambios')
      }

      // Transition to APROBADO then EN_PREPARACION
      await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APROBADO', actor: 'operadora' }),
      })

      await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EN_PREPARACION', actor: 'operadora' }),
      })

      router.push('/admin/pedidos')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar y enviar a cocina'
      alert('Error: ' + message)
    } finally {
      setIsSavingChanges(false)
    }
  }

  const waLink = generateWhatsAppLink(editableCustomerPhone, whatsappText)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/pedidos"
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-amber-700 transition"
        >
          <span>←</span> Volver a la cola FIFO
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
              isEditMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>{isEditMode ? '👁️ Ver Normal' : '✏️ Modo Edición / Cambios'}</span>
          </button>
          <span className="text-xs text-gray-400">ID: {order.id}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-gray-900">
                Pedido #{order.code}
              </h1>
              {order.status === 'EN_CALLE' ? (
                <div className="text-sm font-bold px-3 py-1 bg-amber-50 text-amber-950 rounded-full border border-amber-300 flex items-center gap-1.5">
                  <span>En calle (con repartidor:</span>
                  {order.courier ? (
                    <Link
                      href="/admin/reparto"
                      className="underline text-amber-800 hover:text-amber-950 font-black"
                      title="Ver mochila del repartidor en la sección de Reparto"
                    >
                      {order.courier.name}
                    </Link>
                  ) : (
                    <Link href="/admin/reparto" className="underline font-semibold">
                      Asignado
                    </Link>
                  )}
                  <span>)</span>
                </div>
              ) : (
                <span className="text-sm font-bold px-3 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-200">
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              )}
              {isPriority && order.status !== 'INTERVENCION' && (
                <span className="text-xs font-black px-3 py-1 bg-red-600 text-white rounded-full animate-pulse shadow-xs">
                  🚨 PRIORITARIO (RE-INGRESO)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Ingresado: {formatTime(order.createdAt)} · Transcurrido:{' '}
              {elapsedTime(new Date(order.createdAt))}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap gap-2">
            {order.status === 'RECIBIDO' && (
              <>
                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  <span>🍳</span> A COCINA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('INTERVENCION')
                    setIsEditMode(true)
                    setShowInterventionModal(true)
                  }}
                  disabled={isUpdating}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 text-sm disabled:opacity-50 cursor-pointer"
                >
                  <span>⚠️</span> INTERVENIR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Seguro que deseás cancelar este pedido?')) {
                      handleStatusChange('CANCELADO')
                    }
                  }}
                  disabled={isUpdating}
                  className="bg-gray-100 hover:bg-red-50 text-red-600 font-bold px-3.5 py-2.5 rounded-xl transition text-sm disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </>
            )}

            {order.status === 'EN_PREPARACION' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusChange('LISTO')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm cursor-pointer"
                >
                  <span>✅</span> Marcar como LISTO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('INTERVENCION')
                    setIsEditMode(true)
                    setShowInterventionModal(true)
                  }}
                  disabled={isUpdating}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 text-sm cursor-pointer"
                  title="Regresa el pedido a intervención. El ticket físico actual de cocina debe ser descartado."
                >
                  <span>⚠️</span> Intervenir / Cambio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Seguro que deseás cancelar este pedido?')) {
                      handleStatusChange('CANCELADO')
                    }
                  }}
                  disabled={isUpdating}
                  className="bg-gray-100 hover:bg-red-50 text-red-600 font-bold px-3.5 py-2.5 rounded-xl transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </>
            )}

            {order.status === 'LISTO' && (
              <>
                <Link
                  href="/admin/despacho"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm"
                >
                  <span>🛵</span> Ir a Despacho
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('INTERVENCION')
                    setIsEditMode(true)
                    setShowInterventionModal(true)
                  }}
                  disabled={isUpdating}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <span>⚠️</span> Intervenir
                </button>
              </>
            )}

            {order.status === 'EN_CALLE' && (
              <button
                type="button"
                onClick={() => handleStatusChange('ENTREGADO')}
                disabled={isUpdating}
                className="bg-green-700 hover:bg-green-800 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm cursor-pointer"
              >
                <span>📦</span> Marcar como ENTREGADO
              </button>
            )}

            {order.status === 'INTERVENCION' && (
              <>
                {hadBeenInKitchen ? (
                  <button
                    type="button"
                    onClick={handleSendToKitchen}
                    disabled={isUpdating}
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md transition text-sm flex items-center gap-2 animate-pulse cursor-pointer"
                    title="El pedido ya estuvo en cocina, se re-enviará con ticket prioritario"
                  >
                    <span>🍳</span> Re-enviar a Cocina (PRIORITARIO)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendToKitchen}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md transition text-sm flex items-center gap-2 cursor-pointer"
                    title="Enviar por primera vez a cocina"
                  >
                    <span>🍳</span> Enviar a Cocina
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-sm cursor-pointer"
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Cancelar pedido?')) handleStatusChange('CANCELADO')
                  }}
                  className="bg-red-100 text-red-700 font-bold px-3.5 py-2.5 rounded-xl text-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit Mode Alert / Helper Banner */}
        {isEditMode && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="text-xs text-amber-950 space-y-0.5">
              <p className="font-extrabold text-sm flex items-center gap-1.5">
                <span>✏️</span> Modo de Edición y Modificaciones Activo
              </p>
              <p className="text-amber-800">
                Podés editar el cliente, dirección, medio de pago, notas o agregar/quitar productos del menú.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSavingChanges}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md transition text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingChanges ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        )}

        {/* Customer and Delivery Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer & Delivery Card */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Datos del Cliente y Entrega
              </h3>
              {isEditMode && (
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Editable
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Nombre
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editableCustomerName}
                  onChange={(e) => setEditableCustomerName(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <p className="text-base font-extrabold text-gray-900 mt-0.5">
                  👤 {order.customer.name || 'Sin nombre'}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Teléfono / WhatsApp
              </label>
              {isEditMode ? (
                <input
                  type="tel"
                  value={editableCustomerPhone}
                  onChange={(e) => setEditableCustomerPhone(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-700 mt-0.5">
                  📞 {order.customer.phone}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Dirección
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editableAddress}
                  onChange={(e) => setEditableAddress(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  📍 {order.deliveryAddress}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Referencia de Entrega
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  placeholder="Ej: Timbre 2B, reja blanca..."
                  value={editableRef}
                  onChange={(e) => setEditableRef(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : order.deliveryRef ? (
                <p className="text-xs text-gray-500 italic mt-0.5">
                  Ref: {order.deliveryRef}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Sin referencia</p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold uppercase">Medio de Pago:</span>
              {isEditMode ? (
                <select
                  value={editablePaymentMethod}
                  onChange={(e) => setEditablePaymentMethod(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="EFECTIVO">💵 EFECTIVO</option>
                  <option value="POS">💳 POS (Tarjeta)</option>
                  <option value="TRANSFERENCIA">📲 TRANSFERENCIA</option>
                </select>
              ) : (
                <span className="bg-gray-200 text-gray-800 font-bold px-2 py-0.5 rounded">
                  {order.paymentMethod}
                </span>
              )}
            </div>
          </div>

          {/* Products Summary & Items Editor */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Productos del Pedido
              </h3>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span> Agregar Producto
                </button>
              )}
            </div>

            <div className="space-y-3">
              {(isEditMode ? editableItems : order.items).map((item, index) => {
                return (
                  <div
                    key={index}
                    className="bg-white p-3.5 rounded-xl border border-gray-200 text-sm shadow-2xs space-y-2"
                  >
                    <div className="flex justify-between items-start font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        {isEditMode ? (
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleItemQtyChange(index, -1)}
                              className="w-6 h-6 rounded bg-white font-black text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-xs shadow-2xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-black px-2 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleItemQtyChange(index, 1)}
                              className="w-6 h-6 rounded bg-white font-black text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center justify-center text-xs shadow-2xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span>{item.quantity}x</span>
                        )}
                        <span>{item.product.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-amber-700">
                          {formatCurrency(Number(item.unitPrice) * item.quantity)}
                        </span>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-gray-400 hover:text-red-600 text-xs p-1 rounded hover:bg-red-50 transition cursor-pointer"
                            title="Eliminar producto"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Modifiers breakdown */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="pl-2 border-l-2 border-amber-200 text-xs text-gray-500 space-y-0.5">
                        {item.modifiers.map((m, mIdx) => (
                          <div key={mIdx} className="flex justify-between">
                            <span>
                              ↳ {m.name} {m.qty && m.qty > 1 ? `(x${m.qty})` : ''}
                            </span>
                            {Number(m.priceDelta) > 0 && (
                              <span className="text-amber-600">
                                +{formatCurrency(Number(m.priceDelta) * (m.qty || 1))}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Note / Customization text */}
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          placeholder="Nota o cambio (ej: Sin cebolla, extra salsa)..."
                          value={item.notes || ''}
                          onChange={(e) => handleItemNoteChange(index, e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                        />
                      </div>
                    ) : item.notes ? (
                      <p className="text-xs text-gray-500 italic bg-amber-50/60 border border-amber-200/60 px-2 py-1 rounded">
                        📝 Nota: {item.notes}
                      </p>
                    ) : null}
                  </div>
                )
              })}

              {isEditMode && editableItems.length === 0 && (
                <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl text-center">
                  ⚠️ No hay productos en el pedido. Hacé clic en Agregar Producto.
                </div>
              )}
            </div>

            {/* Total summary */}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="font-extrabold text-sm text-gray-700">Total del Pedido:</span>
              <span className="text-2xl font-black text-amber-700">
                {formatCurrency(isEditMode ? calculatedTotal : Number(order.total))}
              </span>
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={handleSaveAndSendToKitchen}
                disabled={isSavingChanges}
                className={`w-full mt-2 text-white font-black py-3 rounded-xl shadow-md transition text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98 ${
                  hadBeenInKitchen
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSavingChanges ? (
                  'Procesando...'
                ) : hadBeenInKitchen ? (
                  <>
                    <span>🚀</span> Guardar y Re-enviar a Cocina (PRIORITARIO)
                  </>
                ) : (
                  <>
                    <span>🚀</span> Guardar y Enviar a Cocina
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Product from Catalog */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <span>🍔</span> Agregar Producto al Pedido
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {catalog.map((prod) => (
                <div
                  key={prod.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50 px-2 rounded-xl transition"
                >
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {prod.category.name}
                    </span>
                    <h4 className="font-bold text-gray-900 text-sm">{prod.name}</h4>
                    <span className="text-xs font-semibold text-amber-700">
                      {formatCurrency(prod.basePrice)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddProductFromCatalog(prod)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-xl font-black text-gray-900">
                  Intervención del Pedido #{order.code}
                </h3>
              </div>
              <button
                onClick={() => setShowInterventionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              El sistema te ayuda a redactar el mensaje de WhatsApp para resolver cualquier cambio o faltante con el cliente.
            </p>

            {/* Quick issue buttons */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                ¿Cuál es el motivo o cambio?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_ISSUES.map((issue) => (
                  <button
                    key={issue.reason}
                    type="button"
                    onClick={() => handleSelectIssue(issue)}
                    className={`text-left text-xs p-2.5 rounded-xl border transition cursor-pointer ${
                      selectedIssue === issue.reason
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    {issue.label}
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp message editor */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Mensaje para WhatsApp ({editableCustomerPhone})
              </label>
              <textarea
                rows={4}
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              />
            </div>

            {/* Notice regarding physical ticket */}
            {hadBeenInKitchen && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5">
                  <span>🗑️</span> Descartar ticket físico anterior
                </p>
                <p className="text-[11px] text-red-700">
                  Al re-enviar el pedido, la impresora de cocina imprimirá un nuevo ticket físico con la marca <strong>🚨 PRIORITARIO</strong>.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold py-3 px-4 rounded-xl text-center text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💬</span> Abrir WhatsApp Web
              </a>

              {hadBeenInKitchen ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowInterventionModal(false)
                    handleSendToKitchen()
                  }}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm transition shadow-md cursor-pointer"
                >
                  🍳 Re-enviar a Cocina (PRIORITARIO)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowInterventionModal(false)
                    handleSendToKitchen()
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl text-sm transition shadow-md cursor-pointer"
                >
                  🍳 Enviar a Cocina
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
