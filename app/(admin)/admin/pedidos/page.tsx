import { db } from '@/lib/db'
import { OrdersQueueLive } from '@/components/admin/orders-queue-live'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const orders = await db.order.findMany({
    take: 300,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
      statusLogs: true,
    },
  })

  // Sort: Active orders first (FIFO asc), completed/cancelled last (desc)
  const activeStatuses = ['RECIBIDO', 'APROBADO', 'EN_PREPARACION', 'LISTO', 'EN_CALLE', 'INTERVENCION']

  const sorted = [...orders].sort((a, b) => {
    const aActive = activeStatuses.includes(a.status)
    const bActive = activeStatuses.includes(b.status)
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    if (aActive && bActive) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const serializedOrders = orders.map((o) => {
    const hadBeenInKitchen = o.statusLogs.some(
      (l) => l.status === 'EN_PREPARACION' || l.status === 'LISTO'
    )
    const wasIntervened = o.statusLogs.some((l) => l.status === 'INTERVENCION')

    return {
      id: o.id,
      code: o.code,
      status: o.status,
      isPriority: hadBeenInKitchen && wasIntervened,
      hadBeenInKitchen,
      total: Number(o.total),
      paymentMethod: o.paymentMethod,
      deliveryAddress: o.deliveryAddress,
      createdAt: o.createdAt.toISOString(),
      customer: {
        name: o.customer.name,
        phone: o.customer.phone,
      },
      items: o.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        product: {
          name: it.product.name,
          prepTimeMin: it.product.prepTimeMin,
        },
      })),
    }
  })

  return <OrdersQueueLive initialOrders={serializedOrders} />
}
