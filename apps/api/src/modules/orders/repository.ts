import { ObjectId } from 'mongodb';

import { database } from '../../config/database.js';
import { ensureOrdersCollection } from '../../config/mongo-schema.js';
import type { CreateOrderInput, UpdateOrderInput } from './schema.js';
import type { OrderDocument } from './types.js';

const orders = () => database().collection<OrderDocument>('orders');

export const ensureOrderIndexes = async () => {
  await ensureOrdersCollection();
  await orders().createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: 'orders_user_created' },
    { key: { userId: 1, dueDate: 1 }, name: 'orders_user_due_date' },
  ]);
};

export const createOrder = async (
  userId: string,
  input: CreateOrderInput,
  lineItems: OrderDocument['lineItems'],
) => {
  const now = new Date();
  const document: OrderDocument = {
    _id: new ObjectId(),
    userId,
    customer: input.customer,
    dueDate: input.dueDate,
    currency: input.currency,
    lineItems,
    subtotalCents: lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    totalCents: lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    grossPaidCents: 0,
    refundedTotalCents: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await orders().insertOne(document);
  return document;
};

export const findOrders = async (userId: string) => {
  return orders().find({ userId, deletedAt: null }).sort({ createdAt: -1 }).toArray();
};

export const findOrderById = async (userId: string, orderId: ObjectId) => {
  return orders().findOne({ _id: orderId, userId, deletedAt: null });
};

export const updateOrder = async (
  userId: string,
  orderId: ObjectId,
  input: UpdateOrderInput,
  lineItems?: OrderDocument['lineItems'],
) => {
  const update: Partial<OrderDocument> = {
    ...(input.customer === undefined ? {} : { customer: input.customer }),
    ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
    ...(lineItems === undefined
      ? {}
      : {
          lineItems,
          subtotalCents: lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
          totalCents: lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
        }),
    updatedAt: new Date(),
  };

  return orders().findOneAndUpdate(
    { _id: orderId, userId, deletedAt: null },
    { $set: update },
    { returnDocument: 'after' },
  );
};

export const softDeleteOrder = async (userId: string, orderId: ObjectId) => {
  return orders().findOneAndUpdate(
    { _id: orderId, userId, deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
};
