import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import { AppError } from '../../common/errors/app-error.js';
import { recordRefundSchema } from './schema.js';
import { listRefundsUseCase, recordRefundUseCase } from './service.js';
const userId = (request: Request) => {
  const id = (request as AuthenticatedRequest).user?.id;
  if (!id) throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401);
  return id;
};
const orderId = (request: Request) => {
  if (typeof request.params.orderId !== 'string')
    throw new AppError('INVALID_ID', 'Invalid order id.', 400);
  return request.params.orderId;
};
const key = (request: Request) => {
  const value = request.get('Idempotency-Key')?.trim();
  if (!value || value.length > 200)
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Provide a unique Idempotency-Key header.', 400);
  return value;
};
export const recordRefund = async (request: Request, response: Response) => {
  const result = await recordRefundUseCase(
    userId(request),
    orderId(request),
    recordRefundSchema.parse(request.body),
    key(request),
  );
  response.status(result.replayed ? 200 : 201).json({ data: result });
};
export const listRefunds = async (request: Request, response: Response) => {
  response.json({ data: await listRefundsUseCase(userId(request), orderId(request)) });
};
