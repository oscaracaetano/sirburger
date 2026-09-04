'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency, formatTime, formatDate } from '@/lib/utils'
import { generateWhatsAppLink } from '@/lib/whatsapp'

export interface HistoryOrderItem {
  id: string
  quantity: number
  unitPrice: number
  notes: string | null
  modifiers: Array<{ name: string; priceDelta: number; qty?: number }>
  product: {
    name: string
    basePrice: number
  }
}

export interface HistoryCourierData {
  id: string
  name: string
  phone?: string | null
  vehicle?: string | null
  plate?: string | null
  company?: string | null
  photoUrl?: string | null
}

export interface HistoryStatusLog {
  id: string
  status: string
  actor: string | null
  createdAt: string
}

export interface HistoryOrderData {
  id: string
  code: string
  status: string
  total: number
  paymentMethod: string
  deliveryAddress: string
  deliveryRef: string | null
  createdAt: string
  customer: {
    name: string | null
    phone: string
  }
  courier?: HistoryCourierData | null
  items: HistoryOrderItem[]
  statusLogs: HistoryStatusLog[]
}

const STATUS_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  APROBADO: 'Aprobado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  EN_CALLE: 'En calle',
  ENTREGADO: 'Entregado',
  INTERVENCION: 'Intervención',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  RECIBIDO: 'bg-blue-100 text-blue-800 border-blue-200',
  APROBADO: 'bg-purple-100 text-purple-800 border-purple-200',
  EN_PREPARACION: 'bg-amber-100 text-amber-800 border-amber-200',
  LISTO: 'bg-green-100 text-green-800 border-green-200',
  EN_CALLE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ENTREGADO: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  INTERVENCION: 'bg-red-100 text-red-800 border-red-200',
  CANCELADO: 'bg-gray-100 text-gray-600 border-gray-300',
}

export function OrdersHistoryView({ initialOrders }: { initialOrders: HistoryOrderData[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterCourierId, setFilterCourierId] = useState<string>('ALL')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Unique couriers list for filtering
  const couriersList = useMemo(() => {
    const map = new Map<string, string>()
    initialOrders.forEach((o) => {
      if (o.courier) {
        map.set(o.courier.id, o.courier.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [initialOrders])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const qClean = q.replace(/[\s\-\+\(\)#]/g, '')
    const now = new Date()

    return initialOrders.filter((o) => {
      const orderDate = new Date(o.createdAt)

      // 1. Period filter
      if (filterPeriod === 'TODAY') {
        const isToday =
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        if (!isToday) return false
      } else if (filterPeriod === 'YESTERDAY') {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const isYesterday =
          orderDate.getDate() === yesterday.getDate() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getFullYear() === yesterday.getFullYear()
        if (!isYesterday) return false
      } else if (filterPeriod === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (orderDate < weekAgo) return false
      } else if (filterPeriod === 'MONTH') {
        const isSameMonth =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        if (!isSameMonth) return false
      }

      // 2. Status filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'ACTIVE') {
          if (o.status === 'ENTREGADO' || o.status === 'CANCELADO') return false
        } else if (o.status !== filterStatus) {
          return false
        }
      }

      // 3. Courier filter
      if (filterCourierId !== 'ALL') {
        if (!o.courier || o.courier.id !== filterCourierId) return false
      }

      // 4. Search query
      if (q) {
        const code = o.code.toLowerCase().replace('#', '')
        const name = (o.customer.name || '').toLowerCase()
        const address = (o.deliveryAddress || '').toLowerCase()
        const phone = (o.customer.phone || '').replace(/[\s\-\+\(\)]/g, '')
        const courierName = (o.courier?.name || '').toLowerCase()

        const matchCode = o.code.toLowerCase().includes(q) || code.includes(qClean)
        const matchName = name.includes(q)
        const matchAddress = address.includes(q)
        const matchPhone = phone.includes(qClean)
        const matchCourier = courierName.includes(q)

        return matchCode || matchName || matchAddress || matchPhone || matchCourier
      }

      return true
    })
  }, [initialOrders, searchQuery, filterPeriod, filterStatus, filterCourierId])

  // Group filtered orders by Day
  const groupedByDay = useMemo(() => {
    const groups: Record<
      string,
      {
        dateKey: string
        dateLabel: string
        orders: HistoryOrderData[]
        totalSales: number
        deliveredCount: number
      }
    > = {}

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const yesterdayObj = new Date(now)
    yesterdayObj.setDate(yesterdayObj.getDate() - 1)
    const yesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`

    filteredOrders.forEach((order) => {
      const d = new Date(order.createdAt)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      if (!groups[dateKey]) {
        let dateLabel = ''
        if (dateKey === todayStr) {
          dateLabel = `Hoy - ${d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`
        } else if (dateKey === yesterdayStr) {
          dateLabel = `Ayer - ${d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`
        } else {
          dateLabel = d.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        }
        // Capitalize first letter
        dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

        groups[dateKey] = {
          dateKey,
          dateLabel,
          orders: [],
          totalSales: 0,
          deliveredCount: 0,
        }
      }

      groups[dateKey].orders.push(order)
      if (order.status !== 'CANCELADO') {
        groups[dateKey].totalSales += Number(order.total)
      }
      if (order.status === 'ENTREGADO') {
        groups[dateKey].deliveredCount++
      }
    })

    // Sort days descending
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  }, [filteredOrders])

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  // Calculate totals of current filtered set
  const filteredSummary = useMemo(() => {
    const totalCount = filteredOrders.length
    const delivered = filteredOrders.filter((o) => o.status === 'ENTREGADO').length
    const cancelled = filteredOrders.filter((o) => o.status === 'CANCELADO').length
    const totalSales = filteredOrders
      .filter((o) => o.status !== 'CANCELADO')
      .reduce((sum, o) => sum + Number(o.total), 0)

    return { totalCount, delivered, cancelled, totalSales }
  }, [filteredOrders])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header and Subtabs */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Estadísticas y Reportes Operativos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Navegación histórica de pedidos por día, auditoría de tiempos y resolución de reclamos.
        </p>

        {/* Subtabs Navigation */}
        <div className="flex gap-2 border-b border-gray-200 mt-5">
          <Link
            href="/admin/estadisticas"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            📊 Métricas y Rendimiento
          </Link>
          <Link
            href="/admin/estadisticas/historial"
            className="px-4 py-2.5 font-black text-sm text-amber-700 border-b-2 border-amber-600"
          >
            📜 Historial de Pedidos por Día
          </Link>
        </div>
      </div>

      {/* Filter and Search Control Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <span className="text-base">🔍</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por #pedido (ej: A0001), cliente, dirección, teléfono o repartidor..."
            className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-10 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills and Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
          {/* Período */}
          <div>
            <label className="block text-gray-400 uppercase tracking-wider text-[10px] mb-1">
              📅 Período:
            </label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Todos los días</option>
              <option value="TODAY">Hoy</option>
              <option value="YESTERDAY">Ayer</option>
              <option value="WEEK">Últimos 7 días</option>
              <option value="MONTH">Este mes</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-gray-400 uppercase tracking-wider text-[10px] mb-1">
              🏷️ Estado:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ENTREGADO">📦 Solo Entregados</option>
              <option value="CANCELADO">❌ Solo Cancelados</option>
              <option value="ACTIVE">⚡ En Curso (Cocina / Calle)</option>
              <option value="INTERVENCION">⚠️ En Intervención</option>
            </select>
          </div>

          {/* Repartidor */}
          <div>
            <label className="block text-gray-400 uppercase tracking-wider text-[10px] mb-1">
              🛵 Repartidor:
            </label>
            <select
              value={filterCourierId}
              onChange={(e) => setFilterCourierId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Todos los repartidores</option>
              {couriersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setFilterPeriod('ALL')
                setFilterStatus('ALL')
                setFilterCourierId('ALL')
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold p-2.5 rounded-xl transition cursor-pointer text-center"
            >
              🔄 Restablecer Filtros
            </button>
          </div>
        </div>

        {/* Filter Summary Banner */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
          <div>
            Mostrando <strong>{filteredSummary.totalCount}</strong> pedidos
            {filteredSummary.delivered > 0 && ` · ${filteredSummary.delivered} entregados`}
            {filteredSummary.cancelled > 0 && ` · ${filteredSummary.cancelled} cancelados`}
          </div>
          <div className="font-extrabold text-amber-800 text-sm">
            Total ventas seleccionadas: {formatCurrency(filteredSummary.totalSales)}
          </div>
        </div>
      </div>

      {/* Day Groups List */}
      {groupedByDay.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-gray-200 shadow-xs space-y-3">
          <div className="text-4xl">🔍</div>
          <h3 className="text-lg font-black text-gray-900">No se encontraron pedidos</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Probá ajustando la búsqueda o el período seleccionado arriba para ver más órdenes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDay.map((group) => (
            <div
              key={group.dateKey}
              className="bg-white rounded-3xl shadow-xs border border-gray-200 overflow-hidden"
            >
              {/* Day Header Bar */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📅</span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black">{group.dateLabel}</h2>
                    <span className="text-xs text-gray-300">
                      {group.orders.length} pedidos registrados ({group.deliveredCount} entregados)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-gray-300 block uppercase font-bold">
                    Ventas del Día
                  </span>
                  <span className="text-lg sm:text-xl font-black text-amber-400">
                    {formatCurrency(group.totalSales)}
                  </span>
                </div>
              </div>

              {/* Day Orders Accordion List */}
              <div className="divide-y divide-gray-100">
                {group.orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id
                  const orderDate = new Date(order.createdAt)

                  // Calculate Milestone Times for the Expanded Accordion
                  const ingresadoLog = order.statusLogs.find((l) => l.status === 'RECIBIDO') || {
                    createdAt: order.createdAt,
                    status: 'RECIBIDO',
                    actor: 'cliente',
                  }
                  const cocinaLog = order.statusLogs.find((l) => l.status === 'EN_PREPARACION')
                  const listoLog = order.statusLogs.find((l) => l.status === 'LISTO')
                  const despachoLog = order.statusLogs.find((l) => l.status === 'EN_CALLE')
                  const entregadoLog = order.statusLogs.find((l) => l.status === 'ENTREGADO')

                  const tiempoEsperaCocina = cocinaLog
                    ? Math.max(
                        0,
                        Math.round(
                          (new Date(cocinaLog.createdAt).getTime() -
                            new Date(ingresadoLog.createdAt).getTime()) /
                            60000
                        )
                      )
                    : null

                  const tiempoCocina =
                    listoLog && cocinaLog
                      ? Math.max(
                          0,
                          Math.round(
                            (new Date(listoLog.createdAt).getTime() -
                              new Date(cocinaLog.createdAt).getTime()) /
                              60000
                          )
                        )
                      : null

                  const tiempoViaje =
                    entregadoLog && despachoLog
                      ? Math.max(
                          0,
                          Math.round(
                            (new Date(entregadoLog.createdAt).getTime() -
                              new Date(despachoLog.createdAt).getTime()) /
                              60000
                          )
                        )
                      : null

                  const totalElapsedMinutes = entregadoLog
                    ? Math.max(
                        0,
                        Math.round(
                          (new Date(entregadoLog.createdAt).getTime() -
                            new Date(ingresadoLog.createdAt).getTime()) /
                            60000
                        )
                      )
                    : null

                  return (
                    <div key={order.id} className="transition">
                      {/* Compact Clickable Summary Row */}
                      <div
                        onClick={() => toggleExpand(order.id)}
                        className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer hover:bg-amber-50/40 transition select-none ${
                          isExpanded ? 'bg-amber-50/60' : 'bg-white'
                        }`}
                      >
                        {/* Left: Code, Time, Customer & Address */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <span className="font-black text-gray-900 text-lg sm:text-xl shrink-0 font-mono">
                            #{order.code}
                          </span>

                          <span className="text-xs text-gray-400 font-mono shrink-0">
                            {formatTime(orderDate)}
                          </span>

                          <div className="min-w-0 truncate">
                            <span className="font-bold text-gray-900 text-sm">
                              {order.customer.name || 'Cliente'}
                            </span>
                            <span className="text-xs text-gray-400 ml-1.5 font-mono">
                              ({order.customer.phone})
                            </span>
                            <span className="text-gray-400 mx-1.5 hidden sm:inline">·</span>
                            <span className="text-xs text-gray-600 truncate hidden sm:inline">
                              📍 {order.deliveryAddress}
                            </span>
                          </div>
                        </div>

                        {/* Right: Status badge, Courier, Payment, Total & Chevron */}
                        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                              STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </span>

                          {/* Courier badge */}
                          {order.courier ? (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-semibold hidden md:inline-flex items-center gap-1">
                              <span>🛵</span>
                              <span>{order.courier.name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 hidden md:inline">
                              Sin repartidor
                            </span>
                          )}

                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {order.paymentMethod}
                          </span>

                          <span className="font-black text-gray-900 text-base sm:text-lg min-w-[80px] text-right text-amber-700">
                            {formatCurrency(order.total)}
                          </span>

                          <span
                            className={`text-gray-400 font-bold text-xs p-1 rounded transition-transform ${
                              isExpanded ? 'rotate-180 text-amber-600' : ''
                            }`}
                          >
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Expanded Accordion Body */}
                      {isExpanded && (
                        <div className="p-5 sm:p-6 bg-gray-50 border-t border-gray-100 space-y-6 animate-in fade-in zoom-in duration-150">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* 1. Menú y Productos */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
                              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                                <span>🍔</span> Menú Ordenado ({order.items.length})
                              </h4>
                              <div className="space-y-2 text-xs">
                                {order.items.map((it) => (
                                  <div key={it.id} className="pb-2 border-b border-gray-50 last:border-none">
                                    <div className="flex justify-between font-bold text-gray-900">
                                      <span>
                                        {it.quantity}x {it.product.name}
                                      </span>
                                      <span className="text-amber-700">
                                        {formatCurrency(it.unitPrice * it.quantity)}
                                      </span>
                                    </div>
                                    {it.modifiers && it.modifiers.length > 0 && (
                                      <ul className="text-[11px] text-gray-500 mt-1 space-y-0.5 pl-2 border-l-2 border-amber-200">
                                        {it.modifiers.map((mod, idx) => (
                                          <li key={idx} className="flex justify-between">
                                            <span>
                                              • {mod.name} {mod.qty && mod.qty > 1 ? `(x${mod.qty})` : ''}
                                            </span>
                                            {mod.priceDelta ? (
                                              <span className="text-amber-600">
                                                +{formatCurrency(mod.priceDelta)}
                                              </span>
                                            ) : null}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {it.notes && (
                                      <p className="text-[11px] text-amber-800 bg-amber-50 p-1 rounded mt-1">
                                        📝 {it.notes}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 2. Cliente y Pagos */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
                              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                                <span>📍</span> Entrega y Pagos
                              </h4>
                              <div className="space-y-1.5 text-xs text-gray-700">
                                <div>
                                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                                    Cliente
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {order.customer.name || 'Sin nombre'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                                    Teléfono
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold">{order.customer.phone}</span>
                                    <a
                                      href={generateWhatsAppLink(
                                        order.customer.phone,
                                        `Hola ${order.customer.name || ''}, te escribimos de SirBurger por tu pedido #${order.code}.`
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-700 font-extrabold text-[11px] underline"
                                    >
                                      WhatsApp 💬
                                    </a>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                                    Dirección
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {order.deliveryAddress}
                                  </span>
                                  {order.deliveryRef && (
                                    <p className="text-gray-500 italic text-[11px] mt-0.5">
                                      Ref: {order.deliveryRef}
                                    </p>
                                  )}
                                </div>
                                <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                                  <span className="text-gray-400 text-[11px] uppercase font-bold">
                                    Forma de Pago:
                                  </span>
                                  <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                    {order.paymentMethod}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Repartidor Asignado */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
                              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                                <span>🛵</span> Cadete / Repartidor
                              </h4>
                              {order.courier ? (
                                <div className="flex items-start gap-3 pt-1">
                                  {order.courier.photoUrl ? (
                                    <img
                                      src={order.courier.photoUrl}
                                      alt={order.courier.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-amber-300 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 font-black text-lg flex items-center justify-center shrink-0">
                                      {order.courier.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="text-xs space-y-0.5">
                                    <h5 className="font-bold text-gray-900 text-sm">
                                      {order.courier.name}
                                    </h5>
                                    {order.courier.phone && (
                                      <p className="text-gray-500 font-mono">{order.courier.phone}</p>
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                      {order.courier.company && (
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                                          {order.courier.company}
                                        </span>
                                      )}
                                      {order.courier.vehicle && (
                                        <span className="text-[10px] text-gray-500 font-medium">
                                          {order.courier.vehicle} {order.courier.plate ? `(${order.courier.plate})` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-xs text-gray-400">
                                  <span>ℹ️ Este pedido no tuvo repartidor asignado.</span>
                                </div>
                              )}
                            </div>

                            {/* 4. Tiempos Registrados por Etapa */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
                              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                                <span>⏱️</span> Tiempos del Pedido
                              </h4>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">📥 Ingreso:</span>
                                  <span className="font-bold text-gray-800 font-mono">
                                    {formatTime(new Date(ingresadoLog.createdAt))}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-gray-500">🍳 Cocina:</span>
                                  <span className="font-bold text-gray-800 font-mono">
                                    {cocinaLog ? formatTime(new Date(cocinaLog.createdAt)) : '--:--'}
                                    {tiempoEsperaCocina !== null && ` (${tiempoEsperaCocina}m)`}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-gray-500">✅ Listo:</span>
                                  <span className="font-bold text-gray-800 font-mono">
                                    {listoLog ? formatTime(new Date(listoLog.createdAt)) : '--:--'}
                                    {tiempoCocina !== null && ` (${tiempoCocina}m)`}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-gray-500">🛵 Despacho:</span>
                                  <span className="font-bold text-gray-800 font-mono">
                                    {despachoLog ? formatTime(new Date(despachoLog.createdAt)) : '--:--'}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-gray-500">📦 Entrega:</span>
                                  <span className="font-bold text-gray-800 font-mono">
                                    {entregadoLog ? formatTime(new Date(entregadoLog.createdAt)) : '--:--'}
                                    {tiempoViaje !== null && ` (${tiempoViaje}m)`}
                                  </span>
                                </div>

                                {totalElapsedMinutes !== null && (
                                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-black text-amber-700">
                                    <span>⏱️ Tiempo Total:</span>
                                    <span>{totalElapsedMinutes} min</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer Action Links */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                            <span className="text-gray-400 font-mono">ID Interno: {order.id}</span>
                            <Link
                              href={`/admin/pedidos/${order.id}`}
                              className="bg-gray-900 hover:bg-black text-white font-extrabold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <span>📋</span> Ver Ficha Operativa Completa
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
