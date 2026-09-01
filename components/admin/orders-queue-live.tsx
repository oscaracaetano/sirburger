'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency, formatTime, elapsedTime, getDelayColor } from '@/lib/utils'
import { useState, useEffect } from 'react'

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
            className="text-xs bg-white hover:bg-gray-100 border border-gray-200 font-bold px-3 py-1.5 rounded-lg text-gray-700 transition"
          >
            🔄 Actualizar
          </button>
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
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => {
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

            return (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className={`block bg-white rounded-2xl shadow-xs border border-gray-200 border-l-8 ${borderColors[delayColor]} p-5 hover:shadow-md transition hover:border-gray-300`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-gray-900">
                      #{order.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 text-sm">
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

                  <div className="flex items-center gap-4">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                      {order.paymentMethod}
                    </span>
                    <span className="text-base font-extrabold text-amber-700">
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
