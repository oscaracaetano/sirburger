import { db } from '@/lib/db'
import { PrinterConfigView } from '@/components/admin/printer-config-view'

export const dynamic = 'force-dynamic'

export default async function PrinterConfigPage() {
  let config = await db.printerConfig.findUnique({
    where: { id: 'default' },
  })

  if (!config) {
    config = await db.printerConfig.create({
      data: {
        id: 'default',
        driver: 'ZEBRA_ZPL',
        connectionType: 'USB_WINDOWS',
        printerName: 'Zebra GC420t',
        tcpHost: '192.168.1.150',
        tcpPort: 9100,
        autoCut: false,
        soundAlert: true,
        copies: 1,
        ticketHeader: 'SirBurger',
        active: true,
      },
    })
  }

  const serialized = {
    id: config.id,
    driver: config.driver,
    connectionType: config.connectionType,
    printerName: config.printerName,
    tcpHost: config.tcpHost,
    tcpPort: config.tcpPort,
    autoCut: config.autoCut,
    soundAlert: config.soundAlert,
    copies: config.copies,
    ticketHeader: config.ticketHeader,
    active: config.active,
  }

  return <PrinterConfigView initialConfig={serialized} />
}
