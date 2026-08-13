import { calculateNetPaidCents, calculateOrderStatus } from '../../domain/order-status.js';
import type { OrderDocument, OrderResponse } from './types.js';

export const toOrderResponse = (order: OrderDocument): OrderResponse => {
  const netPaidCents = calculateNetPaidCents(order);

  return {
    id: order._id.toHexString(),
    customer: order.customer,
    dueDate: order.dueDate,
    currency: order.currency,
    lineItems: order.lineItems,
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents,
    grossPaidCents: order.grossPaidCents,
    refundedTotalCents: order.refundedTotalCents,
    netPaidCents,
    amountDueCents: Math.max(0, order.totalCents - netPaidCents),
    status: calculateOrderStatus(order),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
};
