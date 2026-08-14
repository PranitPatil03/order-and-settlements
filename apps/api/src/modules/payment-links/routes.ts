import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { env } from '../../config/environment.js';
import { calculateRemainingBalanceCents } from '../../domain/order-status.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import { getPublicOrderContextUseCase } from '../orders/payment-link.js';
import { findCustomerById } from '../customers/repository.js';
import { toPaymentResponse } from '../payments/mapper.js';
import { listPayments } from '../payments/repository.js';
import { createCheckoutSession, getStripeCheckoutMaximumCents } from '../../services/stripe.js';
import { logger } from '../../common/logger.js';
import { createPublicCheckoutSessionSchema } from './schema.js';

const publicPaymentLinksRouter = Router();

export const getToken = (value: unknown) => {
  if (typeof value !== 'string' || value.length < 40 || value.length > 100) {
    throw new AppError('PAYMENT_LINK_INVALID', 'This payment link is invalid or expired.', 404);
  }
  return value;
};

publicPaymentLinksRouter.get(
  '/:token',
  asyncHandler(async (request, response) => {
    const context = await getPublicOrderContextUseCase(getToken(request.params.token));
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
  '/:token/checkout-session',
  asyncHandler(async (request, response) => {
    const token = getToken(request.params.token);
    const context = await getPublicOrderContextUseCase(token);
    const input = createPublicCheckoutSessionSchema.parse(request.body);

    const remainingCents = calculateRemainingBalanceCents(context.order);

    if (remainingCents <= 0) {
      throw new AppError('ORDER_ALREADY_PAID', 'This order is already fully paid.', 409);
    }

    if (input.amountCents > remainingCents) {
      throw new AppError(
        'PAYMENT_EXCEEDS_BALANCE',
        'Payment exceeds the remaining order balance.',
        409,
        {
          maximumAllowedCents: remainingCents,
          requestedAmountCents: input.amountCents,
        },
      );
    }

    const maximumStripePaymentCents = getStripeCheckoutMaximumCents(context.order.currency);
    if (input.amountCents > maximumStripePaymentCents) {
      throw new AppError(
        'STRIPE_AMOUNT_TOO_LARGE',
        'This payment is above Stripe’s per-transaction limit. Enter a smaller amount; the balance can be paid in multiple Stripe payments.',
        409,
        { maximumAllowedCents: maximumStripePaymentCents },
      );
    }

    const baseUrl = env.PUBLIC_APP_URL ?? env.WEB_ORIGIN;
    const successUrl = `${baseUrl}/pay/${token}?checkout=success`;
    const cancelUrl = `${baseUrl}/pay/${token}?checkout=cancel`;

    const customerEmail = context.order.customerId
      ? (
          await findCustomerById(
            context.order.userId,
            parseObjectId(context.order.customerId, 'customerId'),
          )
        )?.email
      : undefined;

    let session;
    try {
      session = await createCheckoutSession({
        orderId: context.order._id.toHexString(),
        userId: context.order.userId,
        customerEmail,
        customerName: context.order.customer,
        amountCents: input.amountCents,
        currency: context.order.currency,
        successUrl,
        cancelUrl,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        { err: error, orderId: context.order._id.toHexString() },
        'Failed to create Stripe checkout session',
      );
      throw new AppError(
        'STRIPE_CHECKOUT_FAILED',
        `Unable to start Stripe checkout: ${error instanceof Error ? error.message : 'Stripe rejected the request.'}`,
        502,
      );
    }

    if (!session.url) {
      throw new AppError('STRIPE_SESSION_ERROR', 'Unable to create Stripe checkout session.', 500);
    }

    response.status(201).json({
      data: {
        url: session.url,
        id: session.id,
      },
    });
  }),
);

export { publicPaymentLinksRouter };
