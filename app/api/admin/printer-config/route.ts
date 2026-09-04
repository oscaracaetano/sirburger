import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Default fallback config
const DEFAULT_CONFIG = {
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
}

export async function GET() {
  try {
    let config = await db.printerConfig.findUnique({
      where: { id: 'default' },
    })

    if (!config) {
      config = await db.printerConfig.create({
        data: DEFAULT_CONFIG,
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching printer config:', error)
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const updated = await db.printerConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        driver: body.driver || 'ZEBRA_ZPL',
        connectionType: body.connectionType || 'USB_WINDOWS',
        printerName: body.printerName || 'Zebra GC420t',
        tcpHost: body.tcpHost || null,
        tcpPort: body.tcpPort ? parseInt(body.tcpPort, 10) : 9100,
        autoCut: Boolean(body.autoCut),
        soundAlert: Boolean(body.soundAlert),
        copies: body.copies ? parseInt(body.copies, 10) : 1,
        ticketHeader: body.ticketHeader || 'SirBurger',
        active: body.active !== undefined ? Boolean(body.active) : true,
      },
      update: {
        driver: body.driver || 'ZEBRA_ZPL',
        connectionType: body.connectionType || 'USB_WINDOWS',
        printerName: body.printerName || 'Zebra GC420t',
        tcpHost: body.tcpHost || null,
        tcpPort: body.tcpPort ? parseInt(body.tcpPort, 10) : 9100,
        autoCut: Boolean(body.autoCut),
        soundAlert: Boolean(body.soundAlert),
        copies: body.copies ? parseInt(body.copies, 10) : 1,
        ticketHeader: body.ticketHeader || 'SirBurger',
        active: body.active !== undefined ? Boolean(body.active) : true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating printer config:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la configuración de la impresora' },
      { status: 500 }
    )
  }
}
