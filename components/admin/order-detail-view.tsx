'use client'

import { useState } from 'react'
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
  { label: '🧀 Cheddar agotado', reason: 'Cheddar', template: 'En este momento nos quedamos sin queso cheddar. ¿Te gustaría cambiarlo por muzzarella o queso tybo sin cargo?' },
  { label: '🥔 Papas fritas agotadas', reason: 'Papas fritas', template: 'Por un momento no tenemos papas rústicas disponibles. ¿Podemos ofrecerte aros de cebolla crocantes en su lugar?' },
  { label: '🍞 Pan de papa agotado', reason: 'Pan de papa', template: 'Nos quedamos sin pan de papa brioche. Tenemos pan artesanal de sésamo recién horneado, ¿te parece bien el cambio?' },
  { label: '⏳ Demora excepcional', reason: 'Demora', template: 'Te contactamos para avisarte que la cocina tiene una demora extra de 15 minutos debido a la alta demanda. ¿Deseás continuar con el pedido?' },
  { label: '📝 Otro motivo', reason: 'Otro', template: 'Te escribimos desde SirBurger respecto a tu pedido para hacerte una consulta.' },
]

export function OrderDetailView({ order }: OrderDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showInterventionModal, setShowInterventionModal] = useState(
    order.status === 'INTERVENCION'
  )
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [whatsappText, setWhatsappText] = useState(
    `Hola ${order.customer.name || ''}! Te contactamos de SirBurger por tu pedido #${order.code}.`
  )

  const handleSelectIssue = (issue: typeof COMMON_ISSUES[0]) => {
    setSelectedIssue(issue.reason)
    setWhatsappText(
      `Hola ${order.customer.name || ''}! Te contactamos de SirBurger por tu pedido #${order.code}.\n\n${issue.template}`
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
    } catch (err) {
      alert('No se pudo actualizar el estado: ' + err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendToKitchen = async () => {
    // Transition RECIBIDO / INTERVENCION -> APROBADO -> EN_PREPARACION
    setIsUpdating(true)
    try {
      if (order.status === 'RECIBIDO' || order.status === 'INTERVENCION') {
        await fetch(`/api/orders/${order.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APROBADO', actor: 'operadora' }),
        })
      }
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

  const waLink = generateWhatsAppLink(order.customer.phone, whatsappText)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/pedidos"
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-amber-700 transition"
        >
          <span>←</span> Volver a la cola FIFO
        </Link>
        <span className="text-xs text-gray-400">ID: {order.id}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900">
                Pedido #{order.code}
              </h1>
              <span className="text-sm font-bold px-3 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-200">
                {STATUS_LABELS[order.status] || order.status}
              </span>
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
                  className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <span>🍳</span> A COCINA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange('INTERVENCION')
                    setShowInterventionModal(true)
                  }}
                  disabled={isUpdating}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 text-sm disabled:opacity-50"
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
                  className="bg-gray-100 hover:bg-red-50 text-red-600 font-bold px-3.5 py-2.5 rounded-xl transition text-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
              </>
            )}

            {order.status === 'EN_PREPARACION' && (
              <button
                type="button"
                onClick={() => handleStatusChange('LISTO')}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm"
              >
                <span>✅</span> Marcar como LISTO
              </button>
            )}

            {order.status === 'LISTO' && (
              <Link
                href="/admin/despacho"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm"
              >
                <span>🛵</span> Ir a Despacho
              </Link>
            )}

            {order.status === 'EN_CALLE' && (
              <button
                type="button"
                onClick={() => handleStatusChange('ENTREGADO')}
                disabled={isUpdating}
                className="bg-green-700 hover:bg-green-800 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 text-sm"
              >
                <span>📦</span> Marcar como ENTREGADO
              </button>
            )}

            {order.status === 'INTERVENCION' && (
              <>
                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-xs transition text-sm"
                >
                  🍳 Enviar a Cocina
                </button>
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-sm"
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Cancelar pedido?')) handleStatusChange('CANCELADO')
                  }}
                  className="bg-red-100 text-red-700 font-bold px-3.5 py-2.5 rounded-xl text-sm"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2-Column Info: Customer / Delivery & Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          {/* Customer & Delivery */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
              Datos del Cliente y Entrega
            </h3>

            <div>
              <p className="text-lg font-bold text-gray-900">
                {order.customer.name || 'Sin nombre'}
              </p>
              <p className="text-sm font-semibold text-gray-600">
                📞 {order.customer.phone}
              </p>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Dirección
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                📍 {order.deliveryAddress}
              </p>
              {order.deliveryRef && (
                <p className="text-xs text-gray-500 italic mt-0.5">
                  Ref: {order.deliveryRef}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold uppercase">Medio de Pago:</span>
              <span className="bg-gray-200 text-gray-800 font-bold px-2 py-0.5 rounded">
                {order.paymentMethod}
              </span>
            </div>
          </div>

          {/* Products Summary */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
              Productos Solicitados
            </h3>

            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-gray-200 text-sm"
                >
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>
                      {item.quantity}x {item.product.name}
                    </span>
                    <span>
                      {formatCurrency(Number(item.unitPrice) * item.quantity)}
                    </span>
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {item.modifiers.map((m, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            • {m.name} {m.qty && m.qty > 1 ? `(x${m.qty})` : ''}
                          </span>
                          {m.priceDelta > 0 && (
                            <span className="font-medium text-amber-700">
                              +{formatCurrency(m.priceDelta * (m.qty || 1))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-1.5 rounded mt-1.5 italic">
                      📝 {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-lg font-black text-gray-900">
              <span>Total Final</span>
              <span className="text-amber-700">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Timeline / Activity Logs */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
            Historial de Actividad y Auditoría (§30)
          </h3>

          <div className="space-y-2">
            {order.statusLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50/50 p-2 rounded-lg"
              >
                <span className="text-gray-400 font-mono w-16">
                  {formatTime(log.createdAt)}
                </span>
                <span className="font-bold text-gray-800">
                  {STATUS_LABELS[log.status] || log.status}
                </span>
                {log.actor && (
                  <span className="text-gray-400 text-[11px]">por {log.actor}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

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
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              El sistema analiza los productos y te ayuda a armar el mensaje de WhatsApp
              para resolver cualquier inconveniente rápidamente con el cliente.
            </p>

            {/* Quick issue buttons */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                ¿Cuál es el inconveniente?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_ISSUES.map((issue) => (
                  <button
                    key={issue.reason}
                    type="button"
                    onClick={() => handleSelectIssue(issue)}
                    className={`text-left text-xs p-2.5 rounded-xl border transition ${
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
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Mensaje para WhatsApp ({order.customer.phone})
              </label>
              <textarea
                rows={4}
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold py-3 px-4 rounded-xl text-center text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>💬</span> Abrir WhatsApp Web
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowInterventionModal(false)
                  handleSendToKitchen()
                }}
                className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition"
              >
                Resolver y A Cocina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
