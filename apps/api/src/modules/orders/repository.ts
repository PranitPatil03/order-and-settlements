import { ObjectId } from 'mongodb';

import { database } from '../../config/database.js';
import type { OrderStatus } from '@orders-and-settlements/shared';
import { ensureOrdersCollection } from '../../config/mongo-schema.js';
import type { CreateOrderInput, ListOrdersInput, UpdateOrderInput } from './schema.js';
import type { OrderDocument } from './types.js';

const orders = () => database().collection<OrderDocument>('orders');

export const ensureOrderIndexes = async () => {
  await ensureOrdersCollection();

  const existingIndexes = await orders().indexes();
  const paymentLinkIndex = existingIndexes.find(
    (index) => index.name === 'orders_payment_link_token',
  );

  const requiresPaymentLinkIndexMigration =
    paymentLinkIndex &&
    (!paymentLinkIndex.unique ||
      paymentLinkIndex.partialFilterExpression?.paymentLinkTokenHash?.$type !== 'string');

  if (requiresPaymentLinkIndexMigration) {
    await orders().dropIndex('orders_payment_link_token');
  }

  await orders().createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: 'orders_user_created' },
    { key: { userId: 1, dueDate: 1 }, name: 'orders_user_due_date' },
    { key: { userId: 1, customerId: 1, createdAt: -1 }, name: 'orders_user_customer_created' },
    {
      key: { paymentLinkTokenHash: 1 },
      name: 'orders_payment_link_token',
      unique: true,
      partialFilterExpression: { paymentLinkTokenHash: { $type: 'string' } },
    },
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
    customerId: input.customerId ?? null,
    customer: input.customer ?? 'Customer',
    dueDate: input.dueDate,
    currency: input.currency,
    lineItems,
    subtotalCents: lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    taxRateBps: input.taxRateBps ?? 0,
    taxCents: Math.round(
      (lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0) * (input.taxRateBps ?? 0)) /
        10_000,
    ),
    totalCents: Math.round(
      lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0) *
        (1 + (input.taxRateBps ?? 0) / 10_000),
    ),
    grossPaidCents: 0,
    refundedTotalCents: 0,
    paymentLinkTokenHash: null,
    paymentLinkAccessCodeHash: null,
    paymentLinkCreatedAt: null,
    paymentLinkRevokedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await orders().insertOne(document);
  return document;
};

export const findOrderByPaymentLinkHash = async (tokenHash: string) => {
  return orders().findOne({
    paymentLinkTokenHash: tokenHash,
    paymentLinkRevokedAt: null,
    deletedAt: null,
  });
};

export const savePaymentLink = async (
  userId: string,
  orderId: ObjectId,
  tokenHash: string,
  accessCodeHash: string,
) => {
  return orders().findOneAndUpdate(
    { _id: orderId, userId, deletedAt: null },
    {
      $set: {
        paymentLinkTokenHash: tokenHash,
        paymentLinkAccessCodeHash: accessCodeHash,
        paymentLinkCreatedAt: new Date(),
        paymentLinkRevokedAt: null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );
};

export const revokePaymentLink = async (userId: string, orderId: ObjectId) => {
  return orders().findOneAndUpdate(
    { _id: orderId, userId, deletedAt: null },
    { $set: { paymentLinkRevokedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
};

const orderStatusExpression = (today: string) => ({
  $switch: {
    branches: [
      {
        case: {
          $gte: [{ $subtract: ['$grossPaidCents', '$refundedTotalCents'] }, '$totalCents'],
        },
        then: 'paid',
      },
      {
        case: { $lt: ['$dueDate', today] },
        then: 'overdue',
      },
      {
        case: { $gt: [{ $subtract: ['$grossPaidCents', '$refundedTotalCents'] }, 0] },
        then: 'partially_paid',
      },
    ],
    default: 'pending',
  },
});

export const findOrdersPage = async (userId: string, input: ListOrdersInput) => {
  const today = new Date().toISOString().slice(0, 10);
  const query = input.q?.trim();
  const pipeline = [
    {
      $match: {
        userId,
        deletedAt: null,
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.refunded ? { refundedTotalCents: { $gt: 0 } } : {}),
        ...(query ? { customer: { $regex: query, $options: 'i' } } : {}),
      },
    },
    { $addFields: { derivedStatus: orderStatusExpression(today) } },
    ...(input.status ? [{ $match: { derivedStatus: input.status as OrderStatus } }] : []),
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        items: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await orders()
    .aggregate<{
      items: OrderDocument[];
      total: Array<{ count: number }>;
    }>(pipeline)
    .toArray();

  return {
    items: result?.items ?? [],
    total: result?.total?.[0]?.count ?? 0,
  };
};

export const findOrdersForExport = async (userId: string, from?: string, to?: string) => {
  const createdAt: Record<string, Date> = {};
  if (from) createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) createdAt.$lt = new Date(`${to}T00:00:00.000Z`);
  return orders()
    .find({ userId, deletedAt: null, ...(Object.keys(createdAt).length ? { createdAt } : {}) })
    .sort({ createdAt: -1 })
    .toArray();
};

export const findOrderById = async (userId: string, orderId: ObjectId) => {
  return orders().findOne({ _id: orderId, userId, deletedAt: null });
};

export const updateOrder = async (
  userId: string,
  orderId: ObjectId,
  input: UpdateOrderInput,
  lineItems?: OrderDocument['lineItems'],
  taxRateBps = input.taxRateBps ?? 0,
) => {
  const update: Partial<OrderDocument> = {
    ...(input.customer === undefined ? {} : { customer: input.customer }),
    ...(input.customerId === undefined ? {} : { customerId: input.customerId }),
    ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
    ...(lineItems === undefined
      ? {}
      : {
          lineItems,
          subtotalCents: lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
          taxRateBps,
          taxCents: Math.round(
            (lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0) *
              taxRateBps) /
              10_000,
          ),
          totalCents: Math.round(
            lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0) *
              (1 + taxRateBps / 10_000),
          ),
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
