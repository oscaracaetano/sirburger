import { db } from '@/lib/db'
import { RepartoView } from '@/components/admin/reparto-view'

export const dynamic = 'force-dynamic'

export default async function RepartoPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const couriers = await db.courier.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      dispatches: {
        where: {
          createdAt: { gte: today },
        },
        include: {
          orders: {
            include: {
              customer: true,
              items: {
                include: { product: true },
              },
              statusLogs: {
                orderBy: { createdAt: 'desc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const formattedCouriers = couriers.map((courier) => {
    const allOrders = courier.dispatches.flatMap((d) => d.orders)
    const inBackpack = allOrders.filter((o) => o.status === 'EN_CALLE')
    const deliveredToday = allOrders.filter((o) => o.status === 'ENTREGADO')
    const cashCollected = deliveredToday
      .filter((o) => o.paymentMethod === 'EFECTIVO')
      .reduce((sum, o) => sum + Number(o.total), 0)

    return {
      id: courier.id,
      name: courier.name,
      cardCode: courier.cardCode,
      phone: (courier as unknown as { phone?: string }).phone || '091090705',
      inBackpack: inBackpack.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        deliveryAddress: o.deliveryAddress,
        deliveryRef: o.deliveryRef,
        paymentMethod: o.paymentMethod,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
        customer: {
          name: o.customer.name,
          phone: o.customer.phone,
        },
        items: o.items.map((i) => ({
          quantity: i.quantity,
          productName: i.product.name,
          notes: i.notes,
        })),
      })),
      deliveredToday: deliveredToday.map((o) => ({
        id: o.id,
        code: o.code,
        total: Number(o.total),
        paymentMethod: o.paymentMethod,
        customerName: o.customer.name,
        deliveryAddress: o.deliveryAddress,
      })),
      cashCollected,
    }
  })

  return <RepartoView initialCouriers={formattedCouriers} />
}
