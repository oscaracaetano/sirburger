import { db } from '@/lib/db'
import { OrdersHistoryView, HistoryOrderData } from '@/components/admin/orders-history-view'

export const dynamic = 'force-dynamic'

export default async function HistorialPedidosPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
      },
      dispatch: {
        include: { courier: true },
      },
    },
    take: 500, // Cargar historial amplio para análisis y reclamos
  })

  const serializedOrders: HistoryOrderData[] = orders.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    total: Number(o.total),
    paymentMethod: o.paymentMethod,
    deliveryAddress: o.deliveryAddress,
    deliveryRef: o.deliveryRef,
    createdAt: o.createdAt.toISOString(),
    customer: {
      name: o.customer.name,
      phone: o.customer.phone,
    },
    courier: o.dispatch?.courier
      ? {
          id: o.dispatch.courier.id,
          name: o.dispatch.courier.name,
          phone: o.dispatch.courier.phone,
          vehicle: o.dispatch.courier.vehicle,
          plate: o.dispatch.courier.plate,
          company: o.dispatch.courier.company,
          photoUrl: o.dispatch.courier.photoUrl,
        }
      : null,
    items: o.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      notes: it.notes,
      modifiers: Array.isArray(it.modifiers) ? (it.modifiers as any) : [],
      product: {
        name: it.product.name,
        basePrice: Number(it.product.basePrice),
      },
    })),
    statusLogs: o.statusLogs.map((l) => ({
      id: l.id,
      status: l.status,
      actor: l.actor,
      createdAt: l.createdAt.toISOString(),
    })),
  }))

  return <OrdersHistoryView initialOrders={serializedOrders} />
}
