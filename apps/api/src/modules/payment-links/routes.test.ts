import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../../common/errors/app-error.js';
import { getToken } from './routes.js';

test('validates payment link tokens by length', () => {
  assert.equal(getToken('a'.repeat(40)), 'a'.repeat(40));
  assert.throws(
    () => getToken('short'),
    (error: unknown) => {
      return error instanceof AppError && error.code === 'PAYMENT_LINK_INVALID';
    },
  );
});
