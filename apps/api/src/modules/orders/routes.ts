import { Router } from 'express';

import { requireAuth } from '../../auth/auth.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createOrder,
  createPaymentLink,
  deleteOrder,
  exportOrders,
  getOrder,
  listOrders,
  revokePaymentLink,
  updateOrder,
} from './controller.js';

const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.get('/', asyncHandler(listOrders));
ordersRouter.get('/export', asyncHandler(exportOrders));
ordersRouter.post('/', asyncHandler(createOrder));
ordersRouter.get('/:orderId', asyncHandler(getOrder));
ordersRouter.post('/:orderId/payment-link', asyncHandler(createPaymentLink));
ordersRouter.delete('/:orderId/payment-link', asyncHandler(revokePaymentLink));
ordersRouter.patch('/:orderId', asyncHandler(updateOrder));
ordersRouter.delete('/:orderId', asyncHandler(deleteOrder));

export { ordersRouter };
