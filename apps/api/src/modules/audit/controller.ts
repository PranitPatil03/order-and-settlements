import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import { AppError } from '../../common/errors/app-error.js';
import { listStatusChanges } from './service.js';
import { parseObjectId } from '../../common/utils/object-id.js';

export const listAuditLogs = async (request: Request, response: Response) => {
  const userId = (request as AuthenticatedRequest).user?.id;
  if (!userId) throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401);
  if (typeof request.params.orderId !== 'string')
    throw new AppError('INVALID_ID', 'Invalid order id.', 400);
  const logs = await listStatusChanges(userId, parseObjectId(request.params.orderId, 'orderId'));
  response.json({
    data: logs.map((log) => ({
      id: log._id.toHexString(),
      orderId: log.orderId.toHexString(),
      eventType: log.eventType,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      occurredAt: log.occurredAt.toISOString(),
    })),
  });
};
