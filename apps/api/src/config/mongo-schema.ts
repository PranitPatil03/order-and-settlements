import type { Document } from 'mongodb';

import { database } from './database.js';

export const customersCollectionValidator: Document = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'name', 'email', 'createdAt', 'updatedAt'],
    properties: {
      userId: { bsonType: 'string', minLength: 1 },
      name: { bsonType: 'string', minLength: 1, maxLength: 200 },
      companyName: { bsonType: ['string', 'null'], maxLength: 200 },
      email: { bsonType: 'string', minLength: 1, maxLength: 320 },
      phone: { bsonType: ['string', 'null'], maxLength: 50 },
      billingAddress: { bsonType: ['string', 'null'], maxLength: 1000 },
      shippingAddress: { bsonType: ['string', 'null'], maxLength: 1000 },
      notes: { bsonType: ['string', 'null'], maxLength: 2000 },
      deletedAt: { bsonType: ['date', 'null'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

export const ordersCollectionValidator: Document = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'userId',
      'customer',
      'dueDate',
      'currency',
      'lineItems',
      'subtotalCents',
      'totalCents',
      'grossPaidCents',
      'refundedTotalCents',
      'deletedAt',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      userId: { bsonType: 'string', minLength: 1 },
      customerId: { bsonType: ['string', 'null'], minLength: 1 },
      customer: { bsonType: 'string', minLength: 1, maxLength: 200 },
      dueDate: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      currency: { bsonType: 'string', minLength: 3, maxLength: 3 },
      lineItems: {
        bsonType: 'array',
        minItems: 1,
        items: {
          bsonType: 'object',
          required: ['description', 'quantity', 'unitPriceCents', 'lineTotalCents'],
          properties: {
            description: { bsonType: 'string', minLength: 1, maxLength: 500 },
            quantity: { bsonType: 'int', minimum: 1 },
            unitPriceCents: { bsonType: ['int', 'long'], minimum: 1 },
            lineTotalCents: { bsonType: ['int', 'long'], minimum: 1 },
          },
        },
      },
      subtotalCents: { bsonType: ['int', 'long'], minimum: 1 },
      totalCents: { bsonType: ['int', 'long'], minimum: 1 },
      grossPaidCents: { bsonType: ['int', 'long'], minimum: 0 },
      refundedTotalCents: { bsonType: ['int', 'long'], minimum: 0 },
      paymentLinkTokenHash: { bsonType: ['string', 'null'], minLength: 1 },
      paymentLinkAccessCodeHash: { bsonType: ['string', 'null'], minLength: 1 },
      paymentLinkCreatedAt: { bsonType: ['date', 'null'] },
      paymentLinkRevokedAt: { bsonType: ['date', 'null'] },
      deletedAt: { bsonType: ['date', 'null'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

export const paymentsCollectionValidator: Document = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'orderId', 'amountCents', 'paidAt', 'note', 'idempotencyKey', 'createdAt'],
    properties: {
      userId: { bsonType: 'string', minLength: 1 },
      orderId: { bsonType: 'objectId' },
      amountCents: { bsonType: ['int', 'long'], minimum: 1 },
      paidAt: { bsonType: 'date' },
      note: { bsonType: ['string', 'null'], maxLength: 1_000 },
      idempotencyKey: { bsonType: 'string', minLength: 1, maxLength: 200 },
      createdAt: { bsonType: 'date' },
    },
  },
};

export const refundsCollectionValidator: Document = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'userId',
      'orderId',
      'amountCents',
      'refundedAt',
      'note',
      'idempotencyKey',
      'createdAt',
    ],
    properties: {
      userId: { bsonType: 'string', minLength: 1 },
      orderId: { bsonType: 'objectId' },
      amountCents: { bsonType: ['int', 'long'], minimum: 1 },
      refundedAt: { bsonType: 'date' },
      note: { bsonType: ['string', 'null'], maxLength: 1_000 },
      idempotencyKey: { bsonType: 'string', minLength: 1, maxLength: 200 },
      createdAt: { bsonType: 'date' },
    },
  },
};

export const auditLogsCollectionValidator: Document = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'orderId', 'eventType', 'fromStatus', 'toStatus', 'occurredAt'],
    properties: {
      userId: { bsonType: 'string', minLength: 1 },
      orderId: { bsonType: 'objectId' },
      eventType: { bsonType: 'string', minLength: 1, maxLength: 100 },
      fromStatus: { bsonType: ['string', 'null'] },
      toStatus: { bsonType: 'string', minLength: 1, maxLength: 50 },
      occurredAt: { bsonType: 'date' },
    },
  },
};

export const ensureCustomersCollection = async () => {
  const collectionExists = await database().listCollections({ name: 'customers' }).hasNext();

  if (!collectionExists) {
    await database().createCollection('customers', {
      validator: customersCollectionValidator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }
};

export const ensureOrdersCollection = async () => {
  const collectionExists = await database().listCollections({ name: 'orders' }).hasNext();

  if (!collectionExists) {
    await database().createCollection('orders', {
      validator: ordersCollectionValidator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }
};

export const ensurePaymentsCollection = async () => {
  const collectionExists = await database().listCollections({ name: 'payments' }).hasNext();

  if (!collectionExists) {
    await database().createCollection('payments', {
      validator: paymentsCollectionValidator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }
};

export const ensureRefundsCollection = async () => {
  if (!(await database().listCollections({ name: 'refunds' }).hasNext())) {
    await database().createCollection('refunds', {
      validator: refundsCollectionValidator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }
};

export const ensureAuditLogsCollection = async () => {
  if (!(await database().listCollections({ name: 'audit_logs' }).hasNext())) {
    await database().createCollection('audit_logs', {
      validator: auditLogsCollectionValidator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }
};
