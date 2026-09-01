import { db } from '@/lib/db'
import { OrdersQueueLive } from '@/components/admin/orders-queue-live'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const orders = await db.order.findMany({
    where: {
      status: {
        notIn: ['ENTREGADO', 'CANCELADO'],
      },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
  })

  const serializedOrders = orders.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
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
  }))

  return <OrdersQueueLive initialOrders={serializedOrders} />
}
