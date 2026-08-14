import {
  calculateNetPaidCents,
  calculateOrderStatus,
  calculateRemainingBalanceCents,
} from '../../domain/order-status.js';
import type { OrderDocument, OrderResponse, PublicOrderResponse } from './types.js';

export const toOrderResponse = (order: OrderDocument): OrderResponse => {
  const netPaidCents = calculateNetPaidCents(order);

  return {
    id: order._id.toHexString(),
    customerId: order.customerId,
    customer: order.customer,
    dueDate: order.dueDate,
    currency: order.currency,
    lineItems: order.lineItems,
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents,
    grossPaidCents: order.grossPaidCents,
    refundedTotalCents: order.refundedTotalCents,
    netPaidCents,
    amountDueCents: calculateRemainingBalanceCents(order),
    status: calculateOrderStatus(order),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
};

export const toPublicOrderResponse = (order: OrderDocument): PublicOrderResponse => ({
  ...toOrderResponse(order),
  paymentLinkActive:
    order.paymentLinkRevokedAt === null && order.paymentLinkAccessCodeHash !== null,
});
