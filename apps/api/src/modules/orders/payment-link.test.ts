import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPaymentLinkPayload } from './payment-link.js';

test('buildPaymentLinkPayload is stable for the same order and secret', () => {
  const first = buildPaymentLinkPayload(
    'order-123',
    'https://app.example',
    'secret-secret-secret-secret-secret',
  );
  const second = buildPaymentLinkPayload(
    'order-123',
    'https://app.example',
    'secret-secret-secret-secret-secret',
  );

  assert.deepEqual(second, first);
  assert.match(first.url, /^https:\/\/app\.example\/pay\/[A-Za-z0-9_-]+$/);
  assert.equal(first.accessCode.length, 10);
});

test('buildPaymentLinkPayload changes with a different order id', () => {
  const first = buildPaymentLinkPayload(
    'order-123',
    'https://app.example',
    'secret-secret-secret-secret-secret',
  );
  const second = buildPaymentLinkPayload(
    'order-456',
    'https://app.example',
    'secret-secret-secret-secret-secret',
  );

  assert.notEqual(first.url, second.url);
  assert.notEqual(first.accessCode, second.accessCode);
});
