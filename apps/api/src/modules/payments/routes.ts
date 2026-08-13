import { Router } from 'express';

import { requireAuth } from '../../auth/auth.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { listPayments, recordPayment } from './controller.js';

const paymentsRouter = Router({ mergeParams: true });

paymentsRouter.use(requireAuth);
paymentsRouter.get('/', asyncHandler(listPayments));
paymentsRouter.post('/', asyncHandler(recordPayment));

export { paymentsRouter };
