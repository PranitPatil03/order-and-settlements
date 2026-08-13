import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import { AppError } from '../../common/errors/app-error.js';
import { recordPaymentSchema } from './schema.js';
import { listPaymentsUseCase, recordPaymentUseCase } from './service.js';

const getUserId = (request: Request) => {
  const userId = (request as AuthenticatedRequest).user?.id;

  if (!userId) {
    throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401);
  }

  return userId;
};

const getIdempotencyKey = (request: Request) => {
  const key = request.get('Idempotency-Key')?.trim();

  if (!key || key.length > 200) {
    throw new AppError(
      'IDEMPOTENCY_KEY_REQUIRED',
      'Provide a unique Idempotency-Key header so payment retries cannot create duplicates.',
      400,
    );
  }

  return key;
};

const getOrderId = (request: Request) => {
  const orderId = request.params.orderId;

  if (typeof orderId !== 'string') {
    throw new AppError('INVALID_ID', 'orderId must be a valid identifier.', 400);
  }

  return orderId;
};

export const recordPayment = async (request: Request, response: Response) => {
  const result = await recordPaymentUseCase(
    getUserId(request),
    getOrderId(request),
    recordPaymentSchema.parse(request.body),
    getIdempotencyKey(request),
  );

  response.status(result.replayed ? 200 : 201).json({ data: result });
};

export const listPayments = async (request: Request, response: Response) => {
  response.status(200).json({
    data: await listPaymentsUseCase(getUserId(request), getOrderId(request)),
  });
};
