import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { listAuditLogs } from './controller.js';

const auditRouter = Router({ mergeParams: true });
auditRouter.use(requireAuth);
auditRouter.get('/', asyncHandler(listAuditLogs));
export { auditRouter };
