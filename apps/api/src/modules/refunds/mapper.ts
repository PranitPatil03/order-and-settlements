import type { RefundDocument, RefundResponse } from './types.js';

export const toRefundResponse = (refund: RefundDocument): RefundResponse => ({
  id: refund._id.toHexString(),
  orderId: refund.orderId.toHexString(),
  amountCents: refund.amountCents,
  refundedAt: refund.refundedAt.toISOString(),
  note: refund.note,
  createdAt: refund.createdAt.toISOString(),
});
