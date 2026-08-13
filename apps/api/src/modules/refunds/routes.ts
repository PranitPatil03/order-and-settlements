import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { listRefunds, recordRefund } from './controller.js';
const refundsRouter = Router({ mergeParams: true });
refundsRouter.use(requireAuth);
refundsRouter.get('/', asyncHandler(listRefunds));
refundsRouter.post('/', asyncHandler(recordRefund));
export { refundsRouter };
