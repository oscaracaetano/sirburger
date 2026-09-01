import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatTime } from '@/lib/utils'
import { generateWhatsAppLink } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const order = await db.order.findUnique({
    where: { code },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
  })

  if (!order) {
    return notFound()
  }

  const helpWhatsAppLink = generateWhatsAppLink(
    '1199998888', // local whatsapp number
    `Hola SirBurger! Tengo una consulta sobre mi pedido #${order.code}.`
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-gray-200 text-center">
        {/* Animated Check Icon */}
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl mb-5 ring-8 ring-green-50">
          ✓
        </div>

        <span className="inline-block bg-amber-100 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          Pedido Confirmado
        </span>

        <h1 className="text-3xl font-black text-gray-900">
          ¡Recibimos tu pedido!
        </h1>

        <div className="my-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 inline-block">
          <p className="text-xs text-amber-800 uppercase font-bold tracking-wider">
            Número de Pedido
          </p>
          <p className="text-4xl font-black text-amber-700 tracking-wider mt-1">
            #{order.code}
          </p>
        </div>

        <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
          Estamos procesándolo y te avisaremos por WhatsApp en cuanto el repartidor
          salga hacia tu domicilio con tu pedido calentito.
        </p>

        {/* Order Details Accordion / Summary */}
        <div className="mt-8 text-left bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
          <div className="flex justify-between items-center text-xs text-gray-500 border-b pb-2">
            <span>Hora: {formatTime(order.createdAt)}</span>
            <span>Pago: {order.paymentMethod}</span>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Dirección de entrega
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {order.deliveryAddress}
            </p>
            {order.deliveryRef && (
              <p className="text-xs text-gray-500 italic mt-0.5">
                Ref: {order.deliveryRef}
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Detalle
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-3 flex justify-between items-center text-lg font-black text-gray-900">
            <span>Total</span>
            <span className="text-amber-600">
              {formatCurrency(Number(order.total))}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition"
          >
            Volver al Inicio
          </Link>
          <a
            href={helpWhatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition inline-flex items-center justify-center gap-2"
          >
            <span>💬</span> Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
