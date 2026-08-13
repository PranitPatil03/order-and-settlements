import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';

import { logger } from '../logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (request, response) => {
    const requestId = request.headers['x-request-id'];
    const resolvedRequestId = typeof requestId === 'string' ? requestId : randomUUID();
    response.setHeader('x-request-id', resolvedRequestId);
    return resolvedRequestId;
  },
});
