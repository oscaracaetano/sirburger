'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/utils'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'POS' | 'TRANSFERENCIA'>('EFECTIVO')
  const [cashAmount, setCashAmount] = useState('') // Con cuánto paga si es efectivo

  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Phone lookup on blur
  const handlePhoneBlur = async () => {
    if (phone.trim().length >= 8) {
      setIsLookingUp(true)
      try {
        const res = await fetch(`/api/customer/lookup?phone=${encodeURIComponent(phone)}`)
        const data = await res.json()
        if (data.found) {
          if (!name && data.name) setName(data.name)
          if (!address && data.address) setAddress(data.address)
          if (!reference && data.reference) setReference(data.reference)
          setLookupMessage('¡Te encontramos! Completamos tus datos habituales.')
        }
      } catch (err) {
        console.error('Lookup failed', err)
      } finally {
        setIsLookingUp(false)
      }
    }
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (items.length === 0) {
      setErrorMsg('Tu carrito está vacío.')
      return
    }

    if (!phone.trim() || !address.trim()) {
      setErrorMsg('Por favor completá tu teléfono y dirección de entrega.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        customerName: name.trim() || 'Cliente Delivery',
        customerPhone: phone.trim(),
        deliveryAddress: address.trim(),
        deliveryRef: reference.trim()
          ? `${reference.trim()}${cashAmount ? ` (Paga con: $${cashAmount})` : ''}`
          : cashAmount
          ? `(Paga con: $${cashAmount})`
          : undefined,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m) => ({
            name: m.name,
            priceDelta: m.priceDelta,
            qty: m.qty,
          })),
          notes: item.notes,
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el pedido')
      }

      // Success: clear cart and redirect to confirmation
      clearCart()
      router.push(`/confirmacion/${data.code}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión. Intentá nuevamente.'
      setErrorMsg(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-gray-900">Carrito vacío</h1>
        <p className="text-gray-500 text-sm mt-2">
          No hay productos en tu carrito para realizar un pedido.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 bg-amber-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-700 transition"
        >
          Ir al Menú
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/carrito"
        className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800 mb-6 transition"
      >
        <span>←</span> Volver al carrito
      </Link>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-6">
        Finalizar Pedido
      </h1>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* Section 1: Datos de Entrega */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <span>📍</span> Datos de Entrega
          </h2>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Teléfono Celular / WhatsApp <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setLookupMessage(null)
                }}
                onBlur={handlePhoneBlur}
                placeholder="Ej: 091 090 705"
                className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium"
              />
              {isLookingUp && (
                <span className="absolute right-3 top-3.5 text-xs text-amber-600 animate-pulse font-medium">
                  Buscando...
                </span>
              )}
            </div>
            {lookupMessage && (
              <p className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
                <span>✓</span> {lookupMessage}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              Te enviaremos actualizaciones sobre el estado de tu delivery por WhatsApp.
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Tu Nombre Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sofía Rodriguez"
              className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Dirección de Entrega <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. San Martín 1420, Piso 4 Depto B"
              className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Referencia / Indicaciones de llegada (opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: Portón verde entre Belgrano y Moreno. Timbre no funciona."
              className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Section 2: Medio de Pago */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <span>💳</span> Medio de Pago
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Efectivo */}
            <label
              className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                paymentMethod === 'EFECTIVO'
                  ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                  : 'border-gray-200 hover:border-gray-300 bg-white font-medium'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💵</span>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="EFECTIVO"
                  checked={paymentMethod === 'EFECTIVO'}
                  onChange={() => setPaymentMethod('EFECTIVO')}
                  className="w-4 h-4 text-amber-600 accent-amber-600"
                />
              </div>
              <span className="text-sm">Efectivo</span>
              <span className="text-xs text-gray-500 font-normal mt-0.5">
                Al recibir el pedido
              </span>
            </label>

            {/* POS */}
            <label
              className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                paymentMethod === 'POS'
                  ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                  : 'border-gray-200 hover:border-gray-300 bg-white font-medium'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💳</span>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="POS"
                  checked={paymentMethod === 'POS'}
                  onChange={() => setPaymentMethod('POS')}
                  className="w-4 h-4 text-amber-600 accent-amber-600"
                />
              </div>
              <span className="text-sm">POS / Tarjeta</span>
              <span className="text-xs text-gray-500 font-normal mt-0.5">
                El repartidor lleva el posnet
              </span>
            </label>

            {/* Transferencia */}
            <label
              className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                paymentMethod === 'TRANSFERENCIA'
                  ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                  : 'border-gray-200 hover:border-gray-300 bg-white font-medium'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📱</span>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="TRANSFERENCIA"
                  checked={paymentMethod === 'TRANSFERENCIA'}
                  onChange={() => setPaymentMethod('TRANSFERENCIA')}
                  className="w-4 h-4 text-amber-600 accent-amber-600"
                />
              </div>
              <span className="text-sm">Transferencia</span>
              <span className="text-xs text-gray-500 font-normal mt-0.5">
                Alias o QR al recibir
              </span>
            </label>
          </div>

          {/* Si paga en efectivo, pedir con cuánto paga */}
          {paymentMethod === 'EFECTIVO' && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ¿Con cuánto vas a pagar? (para calcular el vuelto exacto)
              </label>
              <input
                type="text"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder={`Ej: $${(Math.ceil(subtotal / 1000) * 1000).toLocaleString('es-AR')} o Exacto`}
                className="w-full sm:w-64 border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Section 3: Resumen Final y Botón de Envío */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200 space-y-4">
          <div className="flex justify-between items-center text-gray-600 text-sm">
            <span>Productos ({items.length})</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600 text-sm">
            <span>Costo de Envío</span>
            <span className="text-green-700 font-bold">¡GRATIS!</span>
          </div>

          <div className="border-t pt-3 flex justify-between items-center text-2xl font-black text-gray-900">
            <span>Total Final</span>
            <span className="text-amber-600">{formatCurrency(subtotal)}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-xl shadow-lg transition transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin text-xl">⏳</span> Enviando pedido...
              </span>
            ) : (
              <span>Confirmar y Enviar Pedido 🚀</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
