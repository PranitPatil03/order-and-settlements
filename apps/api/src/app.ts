import express from 'express';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth/auth.js';
import { apiRouter } from './api/router.js';
import { corsMiddleware } from './config/cors.js';
import { env } from './config/environment.js';
import { errorHandler } from './common/middleware/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { requestLogger } from './common/middleware/request-logger.js';
import { stripe } from './services/stripe.js';
import { recordPaymentUseCase } from './modules/payments/service.js';
import { findOrderById } from './modules/orders/repository.js';
import { parseObjectId } from './common/utils/object-id.js';
import { buildPaymentLinkPayload } from './modules/orders/payment-link.js';
import { sendPaymentConfirmationEmail } from './services/email.js';
import { logger } from './common/logger.js';
import { toOrderResponse } from './modules/orders/mapper.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(corsMiddleware);
app.use(requestLogger);

app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      response
        .status(503)
        .json({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured.' } });
      return;
    }

    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      response
        .status(400)
        .json({
          error: { code: 'STRIPE_SIGNATURE_REQUIRED', message: 'Missing Stripe signature.' },
        });
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        const userId = session.metadata?.userId;
        const amountCents = session.amount_total ?? 0;
        const paidAt = session.created
          ? new Date(session.created * 1000).toISOString()
          : new Date().toISOString();

        if (orderId && userId && amountCents > 0) {
          const paymentResult = await recordPaymentUseCase(
            userId,
            orderId,
            {
              amountCents,
              paidAt,
              note: 'Stripe Checkout',
            },
            `stripe:${session.id}`,
          );

          const recipient =
            session.customer_details?.email ??
            session.customer_email ??
            session.metadata?.customerEmail;
          if (recipient && !paymentResult.replayed) {
            const order = await findOrderById(userId, parseObjectId(orderId, 'orderId'));
            if (order) {
              const paymentLink = buildPaymentLinkPayload(
                orderId,
                env.PUBLIC_APP_URL ?? env.WEB_ORIGIN,
                env.BETTER_AUTH_SECRET,
              );
              try {
                await sendPaymentConfirmationEmail({
                  to: recipient,
                  orderNumber: orderId,
                  amountPaid: amountCents,
                  amountDue: toOrderResponse(order).amountDueCents,
                  currency: order.currency,
                  paymentUrl: paymentLink.url,
                  customerName: order.customer,
                });
              } catch (error) {
                logger.error(
                  { err: error, orderId, recipient },
                  'Failed to send payment confirmation email',
                );
              }
            }
          }
        }
      }

      response.status(200).json({ received: true });
    } catch (error) {
      response
        .status(400)
        .json({
          error: { code: 'STRIPE_WEBHOOK_ERROR', message: 'Invalid Stripe webhook signature.' },
        });
    }
  },
);

// Better Auth must receive the raw request before express.json() parses it.
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ data: { status: 'ok' } });
});

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
