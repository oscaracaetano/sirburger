import { OrderStatus } from '@prisma/client'
import { db } from './db'

// Valid state transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECIBIDO: ['APROBADO', 'INTERVENCION', 'CANCELADO'],
  APROBADO: ['EN_PREPARACION'],
  EN_PREPARACION: ['LISTO'],
  LISTO: ['EN_CALLE'],
  EN_CALLE: ['ENTREGADO'],
  ENTREGADO: [],
  INTERVENCION: ['APROBADO', 'CANCELADO'],
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

  const [updatedOrder] = await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { status: newStatus },
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
