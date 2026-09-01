import { db } from '@/lib/db'
import { CouriersConfigView } from '@/components/admin/couriers-config-view'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionRepartidoresPage() {
  const couriers = await db.courier.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })

  const formattedCouriers = couriers.map((c) => ({
    id: c.id,
    name: c.name,
    cardCode: c.cardCode,
    phone: c.phone,
    vehicle: c.vehicle,
    plate: c.plate,
    company: c.company,
    photoUrl: c.photoUrl,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
  }))

  return <CouriersConfigView initialCouriers={formattedCouriers} />
}
