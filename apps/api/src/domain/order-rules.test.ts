import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateOrderTotals } from './order-totals.js';
import { calculateOrderStatus } from './order-status.js';

test('calculates line totals and order subtotal in cents', () => {
  const result = calculateOrderTotals([
    { description: 'Consulting', quantity: 2, unitPriceCents: 50000 },
    { description: 'Support', quantity: 1, unitPriceCents: 25000 },
  ]);
  assert.equal(result.subtotalCents, 125000);
  assert.equal(result.lineItems[0]?.lineTotalCents, 100000);
});

test('derives payment status across pending, partial, paid, and overdue', () => {
  assert.equal(
    calculateOrderStatus({
      totalCents: 1000,
      grossPaidCents: 0,
      refundedTotalCents: 0,
      dueDate: '2099-01-01',
      today: '2026-01-01',
    }),
    'pending',
  );
  assert.equal(
    calculateOrderStatus({
      totalCents: 1000,
      grossPaidCents: 400,
      refundedTotalCents: 0,
      dueDate: '2099-01-01',
      today: '2026-01-01',
    }),
    'partially_paid',
  );
  assert.equal(
    calculateOrderStatus({
      totalCents: 1000,
      grossPaidCents: 1000,
      refundedTotalCents: 0,
      dueDate: '2020-01-01',
      today: '2026-01-01',
    }),
    'paid',
  );
  assert.equal(
    calculateOrderStatus({
      totalCents: 1000,
      grossPaidCents: 0,
      refundedTotalCents: 0,
      dueDate: '2020-01-01',
      today: '2026-01-01',
    }),
    'overdue',
  );
});

test('a refund can move a paid order back to partially paid', () => {
  assert.equal(
    calculateOrderStatus({
      totalCents: 1000,
      grossPaidCents: 1000,
      refundedTotalCents: 100,
      dueDate: '2099-01-01',
      today: '2026-01-01',
    }),
    'partially_paid',
  );
});
