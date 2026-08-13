import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../../common/errors/app-error.js';
import { getAccessCode, getToken } from './routes.js';

const requestWithCode = (code?: string) => ({
  get: () => code,
});

test('accepts generated payment access codes with base64url characters', () => {
  assert.equal(getAccessCode(requestWithCode('U1FINCDZG_') as never), 'U1FINCDZG_');
});

test('rejects missing payment access code', () => {
  assert.throws(() => getAccessCode(requestWithCode(undefined) as never), (error: unknown) => {
    return error instanceof AppError && error.code === 'PAYMENT_CODE_REQUIRED';
  });
});

test('validates payment link tokens by length', () => {
  assert.equal(getToken('a'.repeat(40)), 'a'.repeat(40));
  assert.throws(() => getToken('short'), (error: unknown) => {
    return error instanceof AppError && error.code === 'PAYMENT_LINK_INVALID';
  });
});