'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { formatCurrency, formatTime, elapsedTime } from '@/lib/utils'
import { generateWhatsAppLink } from '@/lib/whatsapp'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BackpackItem {
  id: string
  code: string
  status: string
  deliveryAddress: string
  deliveryRef: string | null
  paymentMethod: string
  total: number
  createdAt: string
  customer: {
    name: string | null
    phone: string
  }
  items: Array<{
    quantity: number
    productName: string
    notes: string | null
  }>
}

interface DeliveredItem {
  id: string
  code: string
  total: number
  paymentMethod: string
  customerName: string | null
  deliveryAddress: string
}

interface CourierRepartoData {
  id: string
  name: string
  cardCode: string
  phone: string
  inBackpack: BackpackItem[]
  deliveredToday: DeliveredItem[]
  cashCollected: number
}

export function RepartoView({ initialCouriers }: { initialCouriers: CourierRepartoData[] }) {
  const { data: couriers = initialCouriers, mutate } = useSWR<CourierRepartoData[]>(
    '/api/reparto',
    fetcher,
    {
      fallbackData: initialCouriers,
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  )

  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  // Reassign Modal State
  const [reassignModalOrder, setReassignModalOrder] = useState<{
    order: BackpackItem
    currentCourierId: string
    currentCourierName: string
  } | null>(null)
  const [targetCourierId, setTargetCourierId] = useState<string>('')

  // Courier WhatsApp Modal State
  const [whatsappModal, setWhatsappModal] = useState<{
    order: BackpackItem
    courier: CourierRepartoData
  } | null>(null)
  const [notificationType, setNotificationType] = useState<'DIRECCION' | 'CANCELADO' | 'PAGO' | 'LIBRE'>('DIRECCION')
  const [customNewAddress, setCustomNewAddress] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [messageText, setMessageText] = useState('')

  // Update WhatsApp text when notification type or values change
  const updateMessageText = (
    type: 'DIRECCION' | 'CANCELADO' | 'PAGO' | 'LIBRE',
    order: BackpackItem,
    courier: CourierRepartoData,
    newAddr: string,
    note: string
  ) => {
    const custName = order.customer.name || 'el cliente'
    const addr = order.deliveryAddress

    if (type === 'DIRECCION') {
      const targetAddr = newAddr.trim() || addr
      setMessageText(
        `*${courier.name}*, atención con el pedido *#${order.code}* a *${custName}*:\n` +
        `📍 Cambió la dirección de entrega. La nueva dirección es:\n*${targetAddr}*`
      )
    } else if (type === 'CANCELADO') {
      setMessageText(
        `⚠️ *${courier.name}*, el pedido *#${order.code}* a *${custName}* en ${addr} se *CANCELÓ*.\n` +
        `Por favor *NO lo entregues* y traelo de vuelta al local.`
      )
    } else if (type === 'PAGO') {
      setMessageText(
        `*${courier.name}*, aviso para el pedido *#${order.code}* a *${custName}* en ${addr}:\n` +
        `💰 ${note.trim() || 'El cliente abonará con el monto exacto / solicitará cambio.'}`
      )
    } else {
      setMessageText(
        `*${courier.name}*, sobre el pedido *#${order.code}* (${custName}):\n` +
        `${note.trim() || 'Por favor comunicate con el local por una novedad del reparto.'}`
      )
    }
  }

  const handleOpenWhatsAppModal = (order: BackpackItem, courier: CourierRepartoData) => {
    setWhatsappModal({ order, courier })
    setNotificationType('DIRECCION')
    setCustomNewAddress(order.deliveryAddress)
    setCustomNote('')
    updateMessageText('DIRECCION', order, courier, order.deliveryAddress, '')
  }

  // Quick Action on order in backpack
  const handleOrderAction = async (orderId: string, status: 'ENTREGADO' | 'INTERVENCION' | 'CANCELADO') => {
    setLoadingActionId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actor: 'operadora (desde reparto)' }),
      })

      if (!res.ok) throw new Error('Error al actualizar estado')
      await mutate()
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setLoadingActionId(null)
    }
  }

  // Handle reassigning order to another courier
  const handleConfirmReassign = async () => {
    if (!reassignModalOrder || !targetCourierId) return

    setLoadingActionId(reassignModalOrder.order.id)
    try {
      const res = await fetch('/api/reparto/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: reassignModalOrder.order.id,
          targetCourierId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reasignar')

      setReassignModalOrder(null)
      setTargetCourierId('')
      await mutate()
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setLoadingActionId(null)
    }
  }

  // Totals summary
  const totalInTransit = couriers.reduce((sum, c) => sum + c.inBackpack.length, 0)
  const totalDeliveredToday = couriers.reduce((sum, c) => sum + c.deliveredToday.length, 0)
  const totalCashInStreet = couriers.reduce((sum, c) => sum + c.cashCollected, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            Control de Reparto en Calle (§22)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo en vivo de mochilas, cambio de repartidores y avisos automáticos por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/despacho"
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <span>🛵</span> Ir a Escáner de Despacho
          </Link>
          <button
            onClick={() => mutate()}
            className="text-xs bg-white hover:bg-gray-100 border border-gray-200 font-bold px-3 py-2 rounded-xl text-gray-700 transition cursor-pointer"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Repartidores Activos
          </span>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
            {couriers.length}
          </p>
        </div>

        <div className="bg-indigo-50/70 p-4 sm:p-5 rounded-2xl border border-indigo-200 shadow-xs">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            Pedidos en Mochila (Viaje)
          </span>
          <p className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
            {totalInTransit}
          </p>
        </div>

        <div className="bg-green-50/70 p-4 sm:p-5 rounded-2xl border border-green-200 shadow-xs">
          <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
            Entregados Hoy
          </span>
          <p className="text-2xl sm:text-3xl font-black text-green-950 mt-1">
            {totalDeliveredToday}
          </p>
        </div>

        <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Efectivo a Rendir (Hoy)
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
            {formatCurrency(totalCashInStreet)}
          </p>
        </div>
      </div>

      {/* Couriers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {couriers.map((courier) => {
          return (
            <div
              key={courier.id}
              className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              {/* Courier Header Card */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl">
                    🛵
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black">{courier.name}</h2>
                      <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-white/20 text-white">
                        {courier.cardCode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                      <span>📞 {courier.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500 text-gray-950">
                    {courier.inBackpack.length} en mochila
                  </span>
                  <p className="text-[11px] text-gray-300 mt-1 font-semibold">
                    Rinde: {formatCurrency(courier.cashCollected)}
                  </p>
                </div>
              </div>

              {/* Backpack Orders Content */}
              <div className="p-5 sm:p-6 flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    🎒 Pedidos en su Mochila ({courier.inBackpack.length})
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">
                    En calle (viaje activo)
                  </span>
                </div>

                {courier.inBackpack.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center text-gray-400">
                    <p className="text-sm font-bold">Mochila libre</p>
                    <p className="text-xs mt-0.5">No tiene pedidos en viaje en este momento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courier.inBackpack.map((order) => {
                      const isActing = loadingActionId === order.id

                      return (
                        <div
                          key={order.id}
                          className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
                        >
                          {/* Top: Code, Customer, and WhatsApp Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/admin/pedidos/${order.id}`}
                                  className="text-base font-black text-gray-900 hover:text-amber-700 transition"
                                >
                                  #{order.code}
                                </Link>
                                <span className="text-xs font-bold text-gray-700">
                                  👤 {order.customer.name || 'Sin nombre'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-gray-800 mt-1">
                                📍 {order.deliveryAddress}
                              </p>
                              {order.deliveryRef && (
                                <p className="text-[11px] text-gray-500 italic">
                                  Ref: {order.deliveryRef}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* WhatsApp Notice Button to Courier */}
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsAppModal(order, courier)}
                                className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="Avisar cambio o novedad por WhatsApp al repartidor"
                              >
                                <span>💬</span> WhatsApp
                              </button>
                            </div>
                          </div>

                          {/* Items and Price */}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                            <span className="text-gray-600 font-medium">
                              {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-500 uppercase">
                                {order.paymentMethod}
                              </span>
                              <span className="font-black text-amber-700 text-sm">
                                {formatCurrency(order.total)}
                              </span>
                            </div>
                          </div>

                          {/* Quick Actions for Order in Backpack */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 flex-wrap">
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleOrderAction(order.id, 'ENTREGADO')}
                              className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <span>📦</span> Marcar Entregado
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() =>
                                  setReassignModalOrder({
                                    order,
                                    currentCourierId: courier.id,
                                    currentCourierName: courier.name,
                                  })
                                }
                                className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                title="Mover este pedido a la mochila de otro repartidor"
                              >
                                <span>🔄</span> Cambiar Mochila
                              </button>

                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleOrderAction(order.id, 'INTERVENCION')}
                                className="bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs px-2 py-1.5 rounded-xl transition cursor-pointer"
                                title="Regresar a intervención"
                              >
                                <span>⚠️</span> Intervenir
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Delivered Orders Accordion / Summary */}
                {courier.deliveredToday.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <details className="group">
                      <summary className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer flex items-center justify-between select-none">
                        <span>✅ Ver {courier.deliveredToday.length} entregas de hoy</span>
                        <span className="group-open:rotate-180 transition">▼</span>
                      </summary>
                      <div className="mt-2 divide-y divide-gray-100 max-h-40 overflow-y-auto text-xs bg-gray-50 rounded-xl p-2">
                        {courier.deliveredToday.map((deliv) => (
                          <div key={deliv.id} className="py-1.5 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-gray-800">#{deliv.code}</span>
                              <span className="text-gray-500 ml-1.5">{deliv.customerName || 'Cliente'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{deliv.paymentMethod}</span>
                              <span className="font-bold text-gray-700">{formatCurrency(deliv.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Reassign Backpack */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <span>🔄</span> Cambiar Pedido de Mochila
              </h3>
              <button
                onClick={() => setReassignModalOrder(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Mover el pedido <strong className="text-gray-900">#{reassignModalOrder.order.code}</strong> (Cliente:{' '}
              {reassignModalOrder.order.customer.name || 'Cliente'}) actualmente en la mochila de{' '}
              <strong className="text-amber-700">{reassignModalOrder.currentCourierName}</strong>:
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Seleccionar nuevo repartidor destino:
              </label>
              <select
                value={targetCourierId}
                onChange={(e) => setTargetCourierId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Elegir Repartidor --</option>
                {couriers
                  .filter((c) => c.id !== reassignModalOrder.currentCourierId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cardCode}) - {c.inBackpack.length} pedidos en mochila
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignModalOrder(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!targetCourierId || loadingActionId === reassignModalOrder.order.id}
                onClick={handleConfirmReassign}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {loadingActionId === reassignModalOrder.order.id ? 'Moviendo...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: WhatsApp Notice to Courier */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Avisar a {whatsappModal.courier.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Pedido #{whatsappModal.order.code} · {whatsappModal.order.customer.name || 'Cliente'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModal(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notification Reason Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                ¿Qué novedad deseás informarle?
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationType('DIRECCION')
                    updateMessageText(
                      'DIRECCION',
                      whatsappModal.order,
                      whatsappModal.courier,
                      customNewAddress,
                      customNote
                    )
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    notificationType === 'DIRECCION'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-2xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  📍 Cambio de Dirección
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNotificationType('CANCELADO')
                    updateMessageText(
                      'CANCELADO',
                      whatsappModal.order,
                      whatsappModal.courier,
                      customNewAddress,
                      customNote
                    )
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    notificationType === 'CANCELADO'
                      ? 'border-red-600 bg-red-50 text-red-950 shadow-2xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  ❌ Pedido Cancelado
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNotificationType('PAGO')
                    updateMessageText(
                      'PAGO',
                      whatsappModal.order,
                      whatsappModal.courier,
                      customNewAddress,
                      customNote
                    )
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    notificationType === 'PAGO'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-2xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  💰 Cambio en Pago / Vuelto
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNotificationType('LIBRE')
                    updateMessageText(
                      'LIBRE',
                      whatsappModal.order,
                      whatsappModal.courier,
                      customNewAddress,
                      customNote
                    )
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    notificationType === 'LIBRE'
                      ? 'border-purple-600 bg-purple-50 text-purple-950 shadow-2xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  📝 Mensaje Libre
                </button>
              </div>
            </div>

            {/* If Change of Address: input for new address */}
            {notificationType === 'DIRECCION' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Nueva Dirección de Entrega:
                </label>
                <input
                  type="text"
                  value={customNewAddress}
                  onChange={(e) => {
                    setCustomNewAddress(e.target.value)
                    updateMessageText(
                      'DIRECCION',
                      whatsappModal.order,
                      whatsappModal.courier,
                      e.target.value,
                      customNote
                    )
                  }}
                  placeholder="Ej: San Martín 1425 (timbre 2)"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Generated WhatsApp Message Preview & Edit */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Mensaje para WhatsApp ({whatsappModal.courier.phone}):
              </label>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href={generateWhatsAppLink(whatsappModal.courier.phone, messageText)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsappModal(null)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 px-4 rounded-xl text-center text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💬</span> Abrir WhatsApp Web con {whatsappModal.courier.name}
              </a>
              <button
                type="button"
                onClick={() => setWhatsappModal(null)}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
