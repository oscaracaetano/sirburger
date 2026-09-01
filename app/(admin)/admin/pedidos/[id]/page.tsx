import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { OrderDetailView } from '@/components/admin/order-detail-view'

export const dynamic = 'force-dynamic'

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!order) return notFound()

  const formattedOrder = {
    id: order.id,
    code: order.code,
    status: order.status,
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    deliveryAddress: order.deliveryAddress,
    deliveryRef: order.deliveryRef,
    createdAt: order.createdAt.toISOString(),
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
    },
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      notes: item.notes,
      modifiers: (item.modifiers as Array<{ name: string; priceDelta: number; qty?: number }>) || [],
      product: {
        name: item.product.name,
        basePrice: Number(item.product.basePrice),
      },
    })),
    statusLogs: order.statusLogs.map((log) => ({
      id: log.id,
      status: log.status,
      actor: log.actor,
      createdAt: log.createdAt.toISOString(),
    })),
  }

  return <OrderDetailView order={formattedOrder} />
}
