import { Router } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ordersRouter } from '../modules/orders/routes.js';
import { paymentsRouter } from '../modules/payments/routes.js';
import { publicPaymentLinksRouter } from '../modules/payment-links/routes.js';
import { refundsRouter } from '../modules/refunds/routes.js';

const apiRouter = Router();

apiRouter.get('/me', requireAuth, (request, response) => {
  const authenticatedRequest = request as AuthenticatedRequest;
  response.status(200).json({ data: { user: authenticatedRequest.user } });
});

apiRouter.use('/orders', ordersRouter);
apiRouter.use('/orders/:orderId/payments', paymentsRouter);
apiRouter.use('/orders/:orderId/refunds', refundsRouter);
apiRouter.use('/public/payment-links', publicPaymentLinksRouter);

export { apiRouter };
