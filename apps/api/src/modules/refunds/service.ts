import { ObjectId } from 'mongodb';
import { mongoClient } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import { toOrderResponse } from '../orders/mapper.js';
import { recordStatusChange } from '../audit/service.js';
import { calculateOrderStatus } from '../../domain/order-status.js';
import {
  findOrderForRefund,
  findRefundByIdempotencyKey,
  incrementRefundTotal,
  insertRefund,
  listRefunds,
} from './repository.js';
import { toRefundResponse } from './mapper.js';
import type { RecordRefundInput } from './schema.js';
import type { RefundDocument } from './types.js';

export const recordRefundUseCase = async (
  userId: string,
  orderIdValue: string,
  input: RecordRefundInput,
  idempotencyKey: string,
) => {
  const orderId = parseObjectId(orderIdValue, 'orderId');
  const existing = await findRefundByIdempotencyKey(userId, idempotencyKey);
  if (existing) {
    const order = await findOrderForRefund(userId, orderId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
    return { refund: toRefundResponse(existing), order: toOrderResponse(order), replayed: true };
  }
  const session = mongoClient.startSession();
  try {
    return await session.withTransaction(async () => {
      const before = await findOrderForRefund(userId, orderId, session);
      if (!before) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
      const updated = await incrementRefundTotal(userId, orderId, input.amountCents, session);
      if (!updated)
        throw new AppError('REFUND_EXCEEDS_PAID', 'Refund exceeds the amount paid.', 409, {
          maximumAllowedCents: before.grossPaidCents - before.refundedTotalCents,
        });
      const refund: RefundDocument = {
        _id: new ObjectId(),
        userId,
        orderId,
        amountCents: input.amountCents,
        refundedAt: new Date(input.refundedAt),
        note: input.note ?? null,
        idempotencyKey,
        createdAt: new Date(),
      };
      await insertRefund(refund, session);
      const fromStatus = calculateOrderStatus(before);
      const toStatus = calculateOrderStatus(updated);
      if (fromStatus !== toStatus)
        await recordStatusChange({ userId, orderId, fromStatus, toStatus }, session);
      return { refund: toRefundResponse(refund), order: toOrderResponse(updated), replayed: false };
    });
  } finally {
    await session.endSession();
  }
};
export const listRefundsUseCase = async (userId: string, orderIdValue: string) => {
  const orderId = parseObjectId(orderIdValue, 'orderId');
  if (!(await findOrderForRefund(userId, orderId)))
    throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
  return (await listRefunds(userId, orderId)).map(toRefundResponse);
};
