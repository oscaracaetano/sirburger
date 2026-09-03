'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency, formatTime, elapsedTime, getDelayColor } from '@/lib/utils'
import { generateWhatsAppLink } from '@/lib/whatsapp'
import { useState, useEffect, useMemo } from 'react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  APROBADO: 'Aprobado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo (para despacho)',
  EN_CALLE: 'En calle',
  ENTREGADO: 'Entregado',
  INTERVENCION: '⚠️ Intervención',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  RECIBIDO: 'bg-blue-100 text-blue-800 border-blue-200',
  APROBADO: 'bg-purple-100 text-purple-800 border-purple-200',
  EN_PREPARACION: 'bg-amber-100 text-amber-800 border-amber-200',
  LISTO: 'bg-green-100 text-green-800 border-green-200',
  EN_CALLE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ENTREGADO: 'bg-gray-100 text-gray-800 border-gray-200',
  INTERVENCION: 'bg-red-100 text-red-800 border-red-200',
  CANCELADO: 'bg-gray-100 text-gray-500 border-gray-200',
}

interface OrderItemData {
  id: string
  quantity: number
  product: {
    name: string
    prepTimeMin: number
  }
}

interface OrderData {
  id: string
  code: string
  status: string
  isPriority?: boolean
  hadBeenInKitchen?: boolean
  total: string | number
  paymentMethod: string
  deliveryAddress: string
  createdAt: string
  customer: {
    name: string | null
    phone: string
  }
  items: OrderItemData[]
}

export function OrdersQueueLive({ initialOrders }: { initialOrders: OrderData[] }) {
  // SWR polling every 4 seconds
  const { data: orders = initialOrders, error, mutate } = useSWR<OrderData[]>(
    '/api/orders',
    fetcher,
    {
      fallbackData: initialOrders,
      refreshInterval: 4000,
      revalidateOnFocus: true,
    }
  )

  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Independent multi-select view filters via checkboxes
  const [filterNuevos, setFilterNuevos] = useState(true)
  const [filterIntervenidos, setFilterIntervenidos] = useState(true)
  const [filterEnPreparacion, setFilterEnPreparacion] = useState(true)
  const [filterListos, setFilterListos] = useState(true)
  const [filterEnCalle, setFilterEnCalle] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  // Calculate counts for each status
  const counts = useMemo(() => {
    let nuevos = 0
    let intervenidos = 0
    let preparacion = 0
    let listos = 0
    let enCalle = 0

    orders.forEach((o) => {
      if (o.status === 'RECIBIDO' || o.status === 'APROBADO') nuevos++
      else if (o.status === 'INTERVENCION') intervenidos++
      else if (o.status === 'EN_PREPARACION') preparacion++
      else if (o.status === 'LISTO') listos++
      else if (o.status === 'EN_CALLE') enCalle++
    })

    return { nuevos, intervenidos, preparacion, listos, enCalle, total: orders.length }
  }, [orders])

  // Filter orders according to active checkboxes AND search query (code, client name, address, phone)
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const qClean = q.replace(/[\s\-\+\(\)#]/g, '')

    return orders.filter((o) => {
      // 1. Status Filter
      const matchesStatus =
        (filterNuevos && (o.status === 'RECIBIDO' || o.status === 'APROBADO')) ||
        (filterIntervenidos && o.status === 'INTERVENCION') ||
        (filterEnPreparacion && o.status === 'EN_PREPARACION') ||
        (filterListos && o.status === 'LISTO') ||
        (filterEnCalle && o.status === 'EN_CALLE')

      if (!matchesStatus) return false

      // 2. Search Query Filter
      if (q) {
        const code = o.code.toLowerCase().replace('#', '')
        const name = (o.customer.name || '').toLowerCase()
        const address = (o.deliveryAddress || '').toLowerCase()
        const phone = (o.customer.phone || '').replace(/[\s\-\+\(\)]/g, '')

        const matchesCode = o.code.toLowerCase().includes(q) || code.includes(qClean)
        const matchesName = name.includes(q)
        const matchesAddress = address.includes(q)
        const matchesPhone = phone.includes(qClean) || (o.customer.phone || '').toLowerCase().includes(q)

        return matchesCode || matchesName || matchesAddress || matchesPhone
      }

      return true
    })
  }, [orders, filterNuevos, filterIntervenidos, filterEnPreparacion, filterListos, filterEnCalle, searchQuery])

  const handleSelectAllFilters = () => {
    setFilterNuevos(true)
    setFilterIntervenidos(true)
    setFilterEnPreparacion(true)
    setFilterListos(true)
    setFilterEnCalle(true)
  }

  const handleSelectActiveOnly = () => {
    setFilterNuevos(true)
    setFilterIntervenidos(true)
    setFilterEnPreparacion(true)
    setFilterListos(false)
    setFilterEnCalle(false)
  }

  const handleClearFilters = () => {
    setFilterNuevos(false)
    setFilterIntervenidos(false)
    setFilterEnPreparacion(false)
    setFilterListos(false)
    setFilterEnCalle(false)
  }

  const handleQuickAction = async (
    e: React.MouseEvent,
    orderId: string,
    action: 'COCINA' | 'LISTO' | 'INTERVENCION' | 'PRIORITARIO' | 'ENTREGADO'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setLoadingOrderId(orderId)

    try {
      if (action === 'COCINA') {
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APROBADO', actor: 'operadora' }),
        })
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'EN_PREPARACION', actor: 'operadora' }),
        })
      } else if (action === 'LISTO') {
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'LISTO', actor: 'operadora' }),
        })
      } else if (action === 'INTERVENCION') {
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'INTERVENCION', actor: 'operadora' }),
        })
      } else if (action === 'PRIORITARIO') {
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APROBADO', actor: 'operadora' }),
        })
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'EN_PREPARACION', actor: 'operadora' }),
        })
      } else if (action === 'ENTREGADO') {
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ENTREGADO', actor: 'operadora' }),
        })
      }

      await mutate()
    } catch (err) {
      alert('Error al actualizar estado: ' + err)
    } finally {
      setLoadingOrderId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Cola de Pedidos en Vivo</h1>
          <p className="text-sm text-gray-500">
            Actualización automática en tiempo real · Orden FIFO (Primero en entrar, primero en salir)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            En vivo (4s)
          </span>
          <button
            onClick={() => mutate()}
            className="text-xs bg-white hover:bg-gray-100 border border-gray-200 font-bold px-3 py-1.5 rounded-lg text-gray-700 transition cursor-pointer"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <span className="text-base">🔍</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar pedidos por número (#F8671), nombre de cliente, dirección o celular..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Checkboxes Control Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
              🎛️ Opciones de Vista y Filtros:
            </span>
            <span className="text-xs font-bold text-gray-400">
              ({filteredOrders.length} de {counts.total} pedidos)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAllFilters}
              className="text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Ver todos
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={handleSelectActiveOnly}
              className="text-gray-600 hover:text-gray-900 font-semibold hover:underline cursor-pointer"
            >
              Solo cocina activa
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-gray-400 hover:text-red-600 font-semibold hover:underline cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>

        {/* Independent Checkboxes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* 1. Nuevos / Recibidos */}
          <label
            className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
              filterNuevos
                ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-extrabold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterNuevos}
                onChange={(e) => setFilterNuevos(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs">📥 Nuevos</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-black ${
                filterNuevos ? 'bg-blue-200/80 text-blue-900' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {counts.nuevos}
            </span>
          </label>

          {/* 2. Intervenidos */}
          <label
            className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
              filterIntervenidos
                ? 'bg-red-50/80 border-red-300 text-red-950 font-extrabold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterIntervenidos}
                onChange={(e) => setFilterIntervenidos(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
              />
              <span className="text-xs">⚠️ Intervenidos</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-black ${
                filterIntervenidos ? 'bg-red-200/80 text-red-900' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {counts.intervenidos}
            </span>
          </label>

          {/* 3. En preparación */}
          <label
            className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
              filterEnPreparacion
                ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-extrabold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterEnPreparacion}
                onChange={(e) => setFilterEnPreparacion(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 accent-amber-600 cursor-pointer"
              />
              <span className="text-xs">🍳 Cocina</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-black ${
                filterEnPreparacion ? 'bg-amber-200/80 text-amber-900' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {counts.preparacion}
            </span>
          </label>

          {/* 4. Listos */}
          <label
            className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
              filterListos
                ? 'bg-green-50/80 border-green-300 text-green-950 font-extrabold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterListos}
                onChange={(e) => setFilterListos(e.target.checked)}
                className="w-4 h-4 rounded text-green-600 accent-green-600 cursor-pointer"
              />
              <span className="text-xs">✅ Listos</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-black ${
                filterListos ? 'bg-green-200/80 text-green-900' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {counts.listos}
            </span>
          </label>

          {/* 5. En calle */}
          <label
            className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
              filterEnCalle
                ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-extrabold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterEnCalle}
                onChange={(e) => setFilterEnCalle(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <span className="text-xs">🛵 En calle</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-black ${
                filterEnCalle ? 'bg-indigo-200/80 text-indigo-900' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {counts.enCalle}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
          Error al sincronizar con el servidor. Reintentando...
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-3">🍔</div>
          <h3 className="text-lg font-bold text-gray-800">No hay pedidos pendientes</h3>
          <p className="text-gray-400 text-sm mt-1">
            Los nuevos pedidos de los clientes aparecerán acá en tiempo real.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-12 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <h3 className="text-base font-bold text-gray-800">
            Ningún pedido coincide con los filtros seleccionados
          </h3>
          <p className="text-gray-400 text-xs">
            Marcá más casilleros arriba o hacé clic en Ver todos para mostrar la cola completa.
          </p>
          <button
            type="button"
            onClick={handleSelectAllFilters}
            className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Mostrar todos los pedidos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => {
            const createdAtDate = new Date(order.createdAt)
            const minutesElapsed = Math.floor(
              (currentTime.getTime() - createdAtDate.getTime()) / 60000
            )
            const expectedMinutes =
              order.items.reduce(
                (sum, item) => sum + item.product.prepTimeMin * item.quantity,
                0
              ) || 15

            const delayColor = getDelayColor(minutesElapsed, expectedMinutes)

            const borderColors = {
              green: 'border-l-green-500',
              yellow: 'border-l-yellow-400',
              orange: 'border-l-orange-500',
              red: 'border-l-red-600',
            }

            const timeBadgeColors = {
              green: 'text-green-700 bg-green-50',
              yellow: 'text-yellow-800 bg-yellow-50',
              orange: 'text-orange-800 bg-orange-50',
              red: 'text-red-700 bg-red-100 font-bold animate-pulse',
            }

            const isThisLoading = loadingOrderId === order.id

            return (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className={`block bg-white rounded-2xl shadow-xs border border-gray-200 border-l-8 ${borderColors[delayColor]} p-4 sm:p-5 hover:shadow-md transition hover:border-gray-300 group`}
              >
                {/* Top Row: Code, Status, Action Buttons, and Timestamp */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                  {/* Left: Code + Status Badge */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl font-black text-gray-900 tracking-tight">
                      #{order.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    {order.isPriority && order.status !== 'INTERVENCION' && (
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse shadow-xs">
                        🚨 PRIORITARIO
                      </span>
                    )}
                  </div>

                  {/* Center: Interactive Action Buttons (Acciones) */}
                  <div
                    className="flex items-center gap-2 flex-wrap"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    {order.status === 'RECIBIDO' && (
                      <>
                        <button
                          type="button"
                          disabled={isThisLoading}
                          onClick={(e) => handleQuickAction(e, order.id, 'COCINA')}
                          className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title="Aprobar y enviar directo a cocina"
                        >
                          <span>🍳</span> A COCINA
                        </button>
                        <button
                          type="button"
                          disabled={isThisLoading}
                          onClick={(e) => handleQuickAction(e, order.id, 'INTERVENCION')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title="Poner en pausa / intervención por faltantes o cambios"
                        >
                          <span>⚠️</span> Intervenir / Cambio
                        </button>
                        <button
                          type="button"
                          disabled={isThisLoading}
                          onClick={(e) => handleQuickAction(e, order.id, 'LISTO')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title="Marcar directamente como listo"
                        >
                          <span>✅</span> Marcar como LISTO
                        </button>
                      </>
                    )}

                    {order.status === 'EN_PREPARACION' && (
                      <>
                        <button
                          type="button"
                          disabled={isThisLoading}
                          onClick={(e) => handleQuickAction(e, order.id, 'INTERVENCION')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title="Regresar a intervención. El ticket físico anterior debe descartarse."
                        >
                          <span>⚠️</span> Intervenir / Cambio
                        </button>
                        <button
                          type="button"
                          disabled={isThisLoading}
                          onClick={(e) => handleQuickAction(e, order.id, 'LISTO')}
                          className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title="Marcar como listo para despacho"
                        >
                          <span>✅</span> Marcar como LISTO
                        </button>
                      </>
                    )}

                    {order.status === 'INTERVENCION' && (
                      <>
                        {order.hadBeenInKitchen ? (
                          <button
                            type="button"
                            disabled={isThisLoading}
                            onClick={(e) => handleQuickAction(e, order.id, 'PRIORITARIO')}
                            className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 animate-pulse cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Re-enviar a cocina con ticket prioritario"
                          >
                            <span>🍳</span> Re-enviar a Cocina (PRIORITARIO)
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isThisLoading}
                            onClick={(e) => handleQuickAction(e, order.id, 'COCINA')}
                            className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Enviar a cocina"
                          >
                            <span>🍳</span> A COCINA
                          </button>
                        )}
                        <a
                          href={generateWhatsAppLink(
                            order.customer.phone,
                            `Hola ${order.customer.name || ''}, te escribimos de SirBurger por tu Pedido #${order.code}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>💬</span> WhatsApp
                        </a>
                      </>
                    )}

                    {order.status === 'LISTO' && (
                      <>
                        <Link
                          href="/admin/despacho"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>🛵</span> Ir a Despacho
                        </Link>
                        <button
                          type="button"
                          disabled={isThisLoading}
                          onClick={(e) => handleQuickAction(e, order.id, 'INTERVENCION')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <span>⚠️</span> Intervenir
                        </button>
                      </>
                    )}

                    {order.status === 'EN_CALLE' && (
                      <button
                        type="button"
                        disabled={isThisLoading}
                        onClick={(e) => handleQuickAction(e, order.id, 'ENTREGADO')}
                        className="bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <span>📦</span> Marcar como ENTREGADO
                      </button>
                    )}

                    {isThisLoading && (
                      <span className="text-xs text-amber-700 font-bold animate-pulse">
                        Actualizando...
                      </span>
                    )}
                  </div>

                  {/* Right: Timestamp and Elapsed delay badge */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">
                      Recibido: {formatTime(createdAtDate)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${timeBadgeColors[delayColor]}`}
                    >
                      ⏱️ {elapsedTime(createdAtDate, currentTime)}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Customer Name, Items, Payment Method, Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-gray-100 text-sm">
                  <div>
                    <span className="font-bold text-gray-900">
                      {order.customer.name || 'Cliente'}
                    </span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">
                      {order.items
                        .map((item) => `${item.quantity}x ${item.product.name}`)
                        .join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                      {order.paymentMethod}
                    </span>
                    <span className="text-base font-black text-amber-700">
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
