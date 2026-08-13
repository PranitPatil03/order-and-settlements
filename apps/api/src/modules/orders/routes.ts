import { Router } from 'express';

import { requireAuth } from '../../auth/auth.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { createOrder, deleteOrder, getOrder, listOrders, updateOrder } from './controller.js';

const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.get('/', asyncHandler(listOrders));
ordersRouter.post('/', asyncHandler(createOrder));
ordersRouter.get('/:orderId', asyncHandler(getOrder));
ordersRouter.patch('/:orderId', asyncHandler(updateOrder));
ordersRouter.delete('/:orderId', asyncHandler(deleteOrder));

export { ordersRouter };
