import { db } from '@/lib/db'
import { DespachoScannerView } from '@/components/admin/despacho-scanner-view'

export const dynamic = 'force-dynamic'

export default async function DespachoPage() {
  try {
    const [couriers, readyOrders] = await Promise.all([
      db.courier.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      db.order.findMany({
        where: { status: 'LISTO' },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const formattedCouriers = couriers.map((c) => ({
      id: c.id,
      name: c.name,
      cardCode: c.cardCode,
    }))

    const formattedReadyOrders = readyOrders.map((o) => ({
      id: o.id,
      code: o.code,
      barcodeValue: o.barcodeValue,
      total: Number(o.total),
      paymentMethod: o.paymentMethod,
      deliveryAddress: o.deliveryAddress,
      customerName: o.customer.name || 'Cliente',
      customerPhone: o.customer.phone,
      itemSummary: o.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', '),
    }))

    return (
      <DespachoScannerView
        couriers={formattedCouriers}
        readyOrders={formattedReadyOrders}
      />
    )
  } catch (err) {
    console.error('Error loading despacho page:', err)
    return <DespachoScannerView couriers={[]} readyOrders={[]} />
  }
}
