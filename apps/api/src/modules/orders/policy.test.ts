import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

import { AppError } from '../../common/errors/app-error.js';
import { assertOrderCanBeDeleted, assertOrderCanChangeLineItems } from './policy.js';
import type { OrderDocument } from './types.js';

const makeOrder = (overrides: Partial<OrderDocument> = {}): OrderDocument => ({
  _id: new ObjectId(),
  userId: 'user-1',
  customerId: null,
  customer: 'Acme',
  dueDate: '2099-01-01',
  currency: 'USD',
  lineItems: [],
  subtotalCents: 0,
  totalCents: 0,
  grossPaidCents: 0,
  refundedTotalCents: 0,
  paymentLinkTokenHash: null,
  paymentLinkAccessCodeHash: null,
  paymentLinkCreatedAt: null,
  paymentLinkRevokedAt: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

test('orders without financial activity remain editable and deletable', () => {
  assert.doesNotThrow(() => assertOrderCanChangeLineItems(makeOrder()));
  assert.doesNotThrow(() => assertOrderCanBeDeleted(makeOrder()));
});

test('orders with payment activity become read-only and undeletable', () => {
  const paidOrder = makeOrder({ grossPaidCents: 1000, totalCents: 1000 });

  assert.throws(
    () => assertOrderCanChangeLineItems(paidOrder),
    (error: unknown) => {
      return error instanceof AppError && error.code === 'ORDER_FINANCIAL_FIELDS_LOCKED';
    },
  );
  assert.throws(
    () => assertOrderCanBeDeleted(paidOrder),
    (error: unknown) => {
      return error instanceof AppError && error.code === 'ORDER_HAS_FINANCIAL_ACTIVITY';
    },
  );
});

test('orders with refund activity are also read-only and undeletable', () => {
  const refundedOrder = makeOrder({ refundedTotalCents: 100 });

  assert.throws(
    () => assertOrderCanChangeLineItems(refundedOrder),
    (error: unknown) => {
      return error instanceof AppError && error.code === 'ORDER_FINANCIAL_FIELDS_LOCKED';
    },
  );
  assert.throws(
    () => assertOrderCanBeDeleted(refundedOrder),
    (error: unknown) => {
      return error instanceof AppError && error.code === 'ORDER_HAS_FINANCIAL_ACTIVITY';
    },
  );
});
