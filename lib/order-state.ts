import { OrderStatus } from '@prisma/client'
import { db } from './db'

// Valid state transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECIBIDO: ['APROBADO', 'INTERVENCION', 'CANCELADO'],
  APROBADO: ['EN_PREPARACION', 'INTERVENCION', 'CANCELADO'],
  EN_PREPARACION: ['LISTO', 'INTERVENCION', 'CANCELADO'],
  LISTO: ['EN_CALLE', 'INTERVENCION', 'CANCELADO'],
  EN_CALLE: ['ENTREGADO', 'INTERVENCION', 'CANCELADO'],
  ENTREGADO: [],
  INTERVENCION: ['APROBADO', 'EN_PREPARACION', 'CANCELADO'],
  CANCELADO: [],
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid transition: ${from} → ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actor?: string
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } })

  if (!canTransition(order.status, newStatus)) {
    throw new InvalidTransitionError(order.status, newStatus)
  }

  // If order moves to INTERVENCION or returns to preparation, reset printedAt so kitchen prints the new ticket
  const shouldResetPrintedAt =
    newStatus === OrderStatus.INTERVENCION ||
    (order.status === OrderStatus.INTERVENCION &&
      (newStatus === OrderStatus.APROBADO || newStatus === OrderStatus.EN_PREPARACION))

  const [updatedOrder] = await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...(shouldResetPrintedAt ? { printedAt: null } : {}),
      },
    }),
    db.orderStatusLog.create({
      data: {
        orderId,
        status: newStatus,
        actor,
      },
    }),
  ])

  return updatedOrder
}
