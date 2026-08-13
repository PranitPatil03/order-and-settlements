import { Request, Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { getPublicOrderContextUseCase } from '../orders/payment-link.js';
import { toPaymentResponse } from '../payments/mapper.js';
import { listPayments } from '../payments/repository.js';
import { recordPaymentUseCase } from '../payments/service.js';
import { recordPublicPaymentSchema } from './schema.js';

const publicPaymentLinksRouter = Router();

const getToken = (value: unknown) => {
  if (typeof value !== 'string' || value.length < 40 || value.length > 100) {
    throw new AppError('PAYMENT_LINK_INVALID', 'This payment link is invalid or expired.', 404);
  }
  return value;
};

const getAccessCode = (request: Request) => {
  const code = request.get('X-Payment-Code')?.trim();
  if (!code || !/^[a-z0-9]{10}$/i.test(code)) {
    throw new AppError('PAYMENT_CODE_REQUIRED', 'Enter the payment access code.', 401);
  }
  return code;
};

publicPaymentLinksRouter.get(
  '/:token',
  asyncHandler(async (request, response) => {
    const context = await getPublicOrderContextUseCase(
      getToken(request.params.token),
      getAccessCode(request),
    );
    response.status(200).json({
      data: {
        order: context.publicOrder,
        payments: (await listPayments(context.order.userId, context.order._id)).map(
          toPaymentResponse,
        ),
      },
    });
  }),
);

publicPaymentLinksRouter.post(
  '/:token/payments',
  asyncHandler(async (request, response) => {
    const token = getToken(request.params.token);
    const context = await getPublicOrderContextUseCase(token, getAccessCode(request));
    const idempotencyKey = request.get('Idempotency-Key')?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return response.status(400).json({
        error: {
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'A unique payment attempt key is required.',
        },
      });
    }
    const input = recordPublicPaymentSchema.parse(request.body);
    const result = await recordPaymentUseCase(
      // Public links intentionally record against the order owner for reporting and ownership.
      context.order.userId,
      context.order._id.toHexString(),
      { amountCents: input.amountCents, paidAt: new Date().toISOString(), note: input.note },
      `public:${idempotencyKey}`,
    );
    response.status(result.replayed ? 200 : 201).json({ data: result });
  }),
);

export { publicPaymentLinksRouter };
