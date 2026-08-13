import { ObjectId, type ClientSession } from 'mongodb';
import { database } from '../../config/database.js';
import { ensureRefundsCollection } from '../../config/mongo-schema.js';
import type { OrderDocument } from '../orders/types.js';
import type { RefundDocument } from './types.js';

const refunds = () => database().collection<RefundDocument>('refunds');
const orders = () => database().collection<OrderDocument>('orders');
export const ensureRefundIndexes = async () => {
  await ensureRefundsCollection();
  await refunds().createIndexes([
    { key: { userId: 1, orderId: 1, refundedAt: -1 }, name: 'refunds_user_order_date' },
    { key: { userId: 1, idempotencyKey: 1 }, name: 'refunds_user_idempotency', unique: true },
  ]);
};
export const findRefundByIdempotencyKey = (
  userId: string,
  idempotencyKey: string,
  session?: ClientSession,
) => refunds().findOne({ userId, idempotencyKey }, { session });
export const listRefunds = (userId: string, orderId: ObjectId) =>
  refunds().find({ userId, orderId }).sort({ refundedAt: -1 }).toArray();
export const findOrderForRefund = (userId: string, orderId: ObjectId, session?: ClientSession) =>
  orders().findOne({ _id: orderId, userId, deletedAt: null }, { session });
export const incrementRefundTotal = (
  userId: string,
  orderId: ObjectId,
  amountCents: number,
  session: ClientSession,
) =>
  orders().findOneAndUpdate(
    {
      _id: orderId,
      userId,
      deletedAt: null,
      $expr: { $lte: [{ $add: ['$refundedTotalCents', amountCents] }, '$grossPaidCents'] },
    },
    { $inc: { refundedTotalCents: amountCents }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after', session },
  );
export const insertRefund = (refund: RefundDocument, session: ClientSession) =>
  refunds().insertOne(refund, { session });
