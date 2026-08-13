import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import { AppError } from '../../common/errors/app-error.js';
import { orderIdSchema } from './schema.js';
import { createPaymentLinkUseCase, revokePaymentLinkUseCase } from './payment-link.js';

const userId = (request: Request) => {
  const value = (request as AuthenticatedRequest).user?.id;
  if (!value) throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401);
  return value;
};

export const createPaymentLink = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  response.status(201).json({ data: await createPaymentLinkUseCase(userId(request), orderId) });
};

export const revokePaymentLink = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  await revokePaymentLinkUseCase(userId(request), orderId);
  response.status(204).send();
};
