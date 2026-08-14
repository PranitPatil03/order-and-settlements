import assert from 'node:assert/strict';
import test from 'node:test';

import { createCustomerSchema } from './schema.js';

test('customer schema accepts required contact fields', () => {
  const payload = {
    name: 'Pranit Patil',
    companyName: 'CrossVal',
    email: 'hello@crossval.io',
    phone: '+91 9876543210',
    billingAddress: 'Pune, India',
    notes: 'VIP client',
  };

  assert.deepEqual(createCustomerSchema.parse(payload), payload);
});
