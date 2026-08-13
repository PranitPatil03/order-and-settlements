import { ObjectId, type ClientSession } from 'mongodb';

import { database } from '../../config/database.js';
import { ensurePaymentsCollection } from '../../config/mongo-schema.js';
import type { OrderDocument } from '../orders/types.js';
import type { PaymentDocument } from './types.js';

const payments = () => database().collection<PaymentDocument>('payments');
const orders = () => database().collection<OrderDocument>('orders');

export const ensurePaymentIndexes = async () => {
  await ensurePaymentsCollection();
  await payments().createIndexes([
    { key: { userId: 1, orderId: 1, paidAt: -1 }, name: 'payments_user_order_paid_at' },
    {
      key: { userId: 1, idempotencyKey: 1 },
      name: 'payments_user_idempotency_key',
      unique: true,
    },
  ]);
};

export const findPaymentByIdempotencyKey = async (
  userId: string,
  idempotencyKey: string,
  session?: ClientSession,
) => {
  return payments().findOne({ userId, idempotencyKey }, { session });
};

export const listPayments = async (userId: string, orderId: ObjectId) => {
  return payments().find({ userId, orderId }).sort({ paidAt: -1, createdAt: -1 }).toArray();
};

export const findOrderForPayment = async (
  userId: string,
  orderId: ObjectId,
  session?: ClientSession,
) => {
  return orders().findOne({ _id: orderId, userId, deletedAt: null }, { session });
};

export const incrementOrderPaidTotal = async (
  userId: string,
  orderId: ObjectId,
  amountCents: number,
  session: ClientSession,
) => {
  return orders().findOneAndUpdate(
    {
      _id: orderId,
      userId,
      deletedAt: null,
      $expr: {
        $lte: [{ $add: ['$grossPaidCents', amountCents] }, '$totalCents'],
      },
    },
    { $inc: { grossPaidCents: amountCents }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after', session },
  );
};

export const insertPayment = async (payment: PaymentDocument, session: ClientSession) => {
  await payments().insertOne(payment, { session });
  return payment;
};
