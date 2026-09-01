import { db } from '@/lib/db'
import { BusinessHoursConfigView } from '@/components/admin/business-hours-config-view'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionHorariosPage() {
  const hours = await db.businessHours.findMany({
    orderBy: { dayOfWeek: 'asc' },
  })

  const formattedHours = hours.map((h) => ({
    id: h.id,
    dayOfWeek: h.dayOfWeek,
    openTime: h.openTime,
    closeTime: h.closeTime,
    isClosed: h.isClosed,
  }))

  return <BusinessHoursConfigView initialHours={formattedHours} />
}
