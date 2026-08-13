import type { PaymentDocument, PaymentResponse } from './types.js';

export const toPaymentResponse = (payment: PaymentDocument): PaymentResponse => ({
  id: payment._id.toHexString(),
  orderId: payment.orderId.toHexString(),
  amountCents: payment.amountCents,
  paidAt: payment.paidAt.toISOString(),
  note: payment.note,
  createdAt: payment.createdAt.toISOString(),
});
