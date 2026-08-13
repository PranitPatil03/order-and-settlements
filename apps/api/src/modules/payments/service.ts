import { ObjectId } from 'mongodb';

import { mongoClient } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import { calculateRemainingBalanceCents } from '../../domain/order-status.js';
import { toOrderResponse } from '../orders/mapper.js';
import {
  findOrderForPayment,
  findPaymentByIdempotencyKey,
  incrementOrderPaidTotal,
  insertPayment,
  listPayments,
} from './repository.js';
import { toPaymentResponse } from './mapper.js';
import type { RecordPaymentInput } from './schema.js';
import type { PaymentDocument } from './types.js';
import { calculateOrderStatus } from '../../domain/order-status.js';
import { recordStatusChange } from '../audit/service.js';

const paymentAlreadyExists = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
};

const getPaymentReplay = async (userId: string, orderId: ObjectId, idempotencyKey: string) => {
  const payment = await findPaymentByIdempotencyKey(userId, idempotencyKey);

  if (payment && !payment.orderId.equals(orderId)) {
    throw new AppError(
      'IDEMPOTENCY_KEY_REUSED',
      'This Idempotency-Key was already used for a different order.',
      409,
    );
  }

  const order = await findOrderForPayment(userId, orderId);

  if (!payment || !order) {
    return null;
  }

  return {
    payment: toPaymentResponse(payment),
    order: toOrderResponse(order),
    replayed: true,
  };
};

export const recordPaymentUseCase = async (
  userId: string,
  orderIdValue: string,
  input: RecordPaymentInput,
  idempotencyKey: string,
) => {
  const orderId = parseObjectId(orderIdValue, 'orderId');
  const existingPayment = await getPaymentReplay(userId, orderId, idempotencyKey);

  if (existingPayment) {
    return existingPayment;
  }

  const session = mongoClient.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const existingInTransaction = await findPaymentByIdempotencyKey(
        userId,
        idempotencyKey,
        session,
      );

      if (existingInTransaction) {
        const order = await findOrderForPayment(userId, orderId, session);

        if (!order) {
          throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
        }

        return {
          payment: toPaymentResponse(existingInTransaction),
          order: toOrderResponse(order),
          replayed: true,
        };
      }

      const beforeOrder = await findOrderForPayment(userId, orderId, session);
      if (!beforeOrder) {
        throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
      }
      const updatedOrder = await incrementOrderPaidTotal(
        userId,
        orderId,
        input.amountCents,
        session,
      );

      if (!updatedOrder) {
        throw new AppError(
          'PAYMENT_EXCEEDS_BALANCE',
          'Payment exceeds the remaining order balance.',
          409,
          {
            maximumAllowedCents: calculateRemainingBalanceCents(beforeOrder),
            requestedAmountCents: input.amountCents,
          },
        );
      }

      const payment: PaymentDocument = {
        _id: new ObjectId(),
        userId,
        orderId,
        amountCents: input.amountCents,
        paidAt: new Date(input.paidAt),
        note: input.note ?? null,
        idempotencyKey,
        createdAt: new Date(),
      };

      await insertPayment(payment, session);
      const fromStatus = calculateOrderStatus(beforeOrder);
      const toStatus = calculateOrderStatus(updatedOrder);
      if (fromStatus !== toStatus) {
        await recordStatusChange({ userId, orderId, fromStatus, toStatus }, session);
      }

      return {
        payment: toPaymentResponse(payment),
        order: toOrderResponse(updatedOrder),
        replayed: false,
      };
    });

    return result;
  } catch (error: unknown) {
    if (paymentAlreadyExists(error)) {
      const replay = await getPaymentReplay(userId, orderId, idempotencyKey);

      if (replay) {
        return replay;
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

export const listPaymentsUseCase = async (userId: string, orderIdValue: string) => {
  const orderId = parseObjectId(orderIdValue, 'orderId');
  const order = await findOrderForPayment(userId, orderId);

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
  }

  return (await listPayments(userId, orderId)).map(toPaymentResponse);
};
