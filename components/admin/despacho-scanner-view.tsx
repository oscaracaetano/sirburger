'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { generateWhatsAppLink, generateEnCalleMessage } from '@/lib/whatsapp'

interface CourierData {
  id: string
  name: string
  cardCode: string
  photoUrl?: string | null
}

interface ReadyOrderData {
  id: string
  code: string
  barcodeValue: string
  total: number
  paymentMethod: string
  deliveryAddress: string
  customerName: string
  customerPhone: string
  itemSummary: string
}

export function DespachoScannerView({
  couriers,
  readyOrders,
}: {
  couriers: CourierData[]
  readyOrders: ReadyOrderData[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [scanInput, setScanInput] = useState('')
  const [selectedCourier, setSelectedCourier] = useState<CourierData | null>(null)
  const [scannedOrders, setScannedOrders] = useState<ReadyOrderData[]>([])
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedDispatch, setCompletedDispatch] = useState<{
    courierName: string
    orders: ReadyOrderData[]
  } | null>(null)
  const [isReprintingId, setIsReprintingId] = useState<string | null>(null)

  const handleReprint = async (orderId: string) => {
    setIsReprintingId(orderId)
    try {
      const res = await fetch('/api/printer/reprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reimprimir')
      setFeedback({ msg: '🖨️ Ticket enviado a la impresora de cocina.', type: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reimprimir'
      setFeedback({ msg: 'Error: ' + msg, type: 'error' })
    } finally {
      setIsReprintingId(null)
    }
  }

  // Keep input focused at all times for the barcode gun
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const rawInput = scanInput.trim()
    setScanInput('')

    if (!rawInput) return

    // Limpieza profunda del texto escaneado para lectores de código de barras:
    // 1. Remover caracteres de control invisibles (ASCII 0-31 y 127)
    const withoutControls = rawInput.replace(/[\x00-\x1F\x7F]/g, '')
    // 2. Remover prefijos de subset o control de pistola (^B, {B, etc.)
    const withoutPrefix = withoutControls.replace(/^(\^[A-Za-z0-9]|\{[A-Za-z0-9])/g, '').trim()
    // 3. Normalizar mapeo de teclado: el '-' (guión) de teclado US se escribe como '\'' (comilla simple) en teclado en español
    const normalizedKey = withoutPrefix.replace(/'/g, '-').toUpperCase()
    // 4. Extraer valor sin prefijo 'SB-' ni '#'
    const stripped = normalizedKey.replace(/^SB[-_']?/i, '').replace(/^#/, '').trim()
    // 5. Detectar patrón de código de pedido secuencial SirBurger (ej: A0001, B0012)
    const orderCodeMatch = normalizedKey.match(/([A-Z]\d{4})/i)
    const detectedOrderCode = orderCodeMatch ? orderCodeMatch[1].toUpperCase() : null

    // 1. Verificar si corresponde a la tarjeta de un repartidor
    const courierMatch = couriers.find((c) => {
      const card = c.cardCode.toUpperCase()
      const cid = c.id.toUpperCase()
      return (
        card === rawInput.toUpperCase() ||
        card === withoutPrefix.toUpperCase() ||
        card === normalizedKey ||
        card === stripped ||
        cid === rawInput.toUpperCase() ||
        cid === normalizedKey
      )
    })

    if (courierMatch) {
      if (selectedCourier && selectedCourier.id === courierMatch.id && scannedOrders.length > 0) {
        // Segundo escaneo de la tarjeta del mismo repartidor -> cerrar despacho
        handleCloseDispatch()
        return
      } else {
        setSelectedCourier(courierMatch)
        setFeedback({ msg: `🛵 Repartidor seleccionado: ${courierMatch.name}`, type: 'success' })
        return
      }
    }

    // 2. Si no es tarjeta de repartidor, verificar si hay repartidor seleccionado
    if (!selectedCourier) {
      setFeedback({
        msg: 'Primero seleccioná o escaneá la tarjeta del repartidor.',
        type: 'error',
      })
      return
    }

    // 3. Buscar el pedido entre los pedidos en estado LISTO
    const orderMatch = readyOrders.find((o) => {
      const oCode = o.code.toUpperCase()
      const oBarcode = o.barcodeValue.toUpperCase()
      const oBarcodeSpanish = oBarcode.replace(/-/g, "'")

      return (
        (detectedOrderCode && oCode === detectedOrderCode) ||
        oCode === stripped ||
        oCode === normalizedKey ||
        oCode === withoutPrefix.toUpperCase() ||
        `#${oCode}` === normalizedKey ||
        `#${oCode}` === rawInput.toUpperCase() ||
        oBarcode === normalizedKey ||
        oBarcode === withoutPrefix.toUpperCase() ||
        oBarcode === rawInput.toUpperCase() ||
        oBarcodeSpanish === rawInput.toUpperCase() ||
        oBarcodeSpanish === withoutControls.toUpperCase() ||
        rawInput.toUpperCase().includes(oCode) ||
        withoutPrefix.toUpperCase().includes(oCode)
      )
    })

    if (!orderMatch) {
      const displayCode = detectedOrderCode ? `#${detectedOrderCode}` : (stripped || rawInput)
      setFeedback({
        msg: `Código "${displayCode}" no encontrado o el pedido no está en estado LISTO.`,
        type: 'error',
      })
      return
    }

    if (scannedOrders.some((o) => o.id === orderMatch.id)) {
      setFeedback({
        msg: `El pedido #${orderMatch.code} ya fue agregado a este despacho.`,
        type: 'error',
      })
      return
    }

    setScannedOrders((prev) => [...prev, orderMatch])
    setFeedback({
      msg: `✓ Pedido #${orderMatch.code} asignado a ${selectedCourier.name}`,
      type: 'success',
    })
  }

  const handleCloseDispatch = async () => {
    if (!selectedCourier || scannedOrders.length === 0) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierId: selectedCourier.id,
          orderIds: scannedOrders.map((o) => o.id),
        }),
      })

      if (!res.ok) throw new Error('Error al cerrar el despacho')

      setCompletedDispatch({
        courierName: selectedCourier.name,
        orders: [...scannedOrders],
      })
      setSelectedCourier(null)
      setScannedOrders([])
      setFeedback({ msg: '🎉 Despacho cerrado con éxito.', type: 'success' })
    } catch (err) {
      setFeedback({ msg: 'Error: ' + err, type: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Estación de Despacho y Reparto
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Escaneá la tarjeta del repartidor con la pistola de códigos y luego los pedidos listos.
        </p>
      </div>

      {/* Barcode Scanner Hidden/Visible Input Bar */}
      <form
        onSubmit={handleScanSubmit}
        className="bg-amber-500 p-4 sm:p-5 rounded-2xl shadow-md text-white flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="text-3xl hidden sm:block">🔫</div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-black uppercase tracking-wider text-amber-100 mb-1">
            Lector de Código de Barras (Escaneo automático)
          </label>
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Apunta la pistola y dispara al código de barras..."
            className="w-full bg-white text-gray-900 font-mono font-bold text-base px-4 py-3 rounded-xl shadow-inner outline-none focus:ring-4 focus:ring-amber-300"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-amber-800 hover:bg-amber-900 font-bold px-6 py-3 rounded-xl transition text-sm text-white"
        >
          Procesar
        </button>
      </form>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl font-bold text-sm flex items-center justify-between animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.msg}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Courier Selector / Display */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200">
        <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
          1. Repartidor Asignado
        </h2>

        <div className="flex flex-wrap gap-3">
          {couriers.map((courier) => {
            const isSelected = selectedCourier?.id === courier.id
            return (
              <button
                key={courier.id}
                type="button"
                onClick={() => {
                  setSelectedCourier(courier)
                  setFeedback({
                    msg: `🛵 Repartidor seleccionado: ${courier.name}`,
                    type: 'success',
                  })
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-sm transition ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                {courier.photoUrl ? (
                  <img
                    src={courier.photoUrl}
                    alt={courier.name}
                    className="w-10 h-10 rounded-xl object-cover border border-amber-400/40 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center shrink-0">
                    {courier.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div>{courier.name}</div>
                  <span className="text-[11px] text-gray-400 font-mono font-normal">
                    Tarjeta: {courier.cardCode}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scanned Orders in Current Dispatch Batch */}
      {selectedCourier && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">
                Pedidos en la mochila de {selectedCourier.name}
              </h2>
              <p className="text-xs text-gray-500">
                {scannedOrders.length} pedido{scannedOrders.length !== 1 ? 's' : ''} cargado
                {scannedOrders.length !== 1 ? 's' : ''}
              </p>
            </div>

            {scannedOrders.length > 0 && (
              <button
                onClick={handleCloseDispatch}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition text-sm flex items-center gap-2 active:scale-98"
              >
                <span>🛵</span> Cerrar Despacho (EN CALLE)
              </button>
            )}
          </div>

          {scannedOrders.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center italic">
              Escaneá los tickets con la pistola para agregarlos a la salida de {selectedCourier.name}...
            </p>
          ) : (
            <div className="space-y-2">
              {scannedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900">#{order.code}</span>
                        <span className="text-xs text-gray-500 font-medium">
                          {order.customerName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">📍 {order.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </span>
                    <button
                      type="button"
                      disabled={isReprintingId === order.id}
                      onClick={() => handleReprint(order.id)}
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                      title="Reimprimir ticket de este pedido"
                    >
                      <span>{isReprintingId === order.id ? '⏳' : '🖨️'}</span> Reimprimir
                    </button>
                    <button
                      onClick={() =>
                        setScannedOrders((prev) => prev.filter((o) => o.id !== order.id))
                      }
                      className="text-gray-400 hover:text-red-600 text-xs font-bold cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed Dispatch Modal with WhatsApp Notification Links */}
      {completedDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-3">
              🛵
            </div>
            <h3 className="text-2xl font-black text-gray-900 text-center">
              ¡Pedidos en Calle!
            </h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              Despachados con {completedDispatch.courierName}. Ahora podés notificar a cada
              cliente con 1 clic por WhatsApp:
            </p>

            <div className="mt-6 space-y-3 max-h-60 overflow-y-auto">
              {completedDispatch.orders.map((order) => {
                const message = generateEnCalleMessage(
                  order.code,
                  order.total.toLocaleString('es-AR'),
                  order.paymentMethod
                )
                const waLink = generateWhatsAppLink(order.customerPhone, message)

                return (
                  <div
                    key={order.id}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-gray-900">
                        #{order.code} · {order.customerName}
                      </p>
                      <p className="text-gray-500 font-mono">{order.customerPhone}</p>
                    </div>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1 shrink-0"
                    >
                      <span>💬</span> Notificar
                    </a>
                  </div>
                )
              })}
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setCompletedDispatch(null)
                  router.refresh()
                }}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
