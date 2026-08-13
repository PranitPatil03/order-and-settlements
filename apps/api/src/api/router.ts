import { Router } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../auth/auth.middleware.js';

const apiRouter = Router();

apiRouter.get('/me', requireAuth, (request, response) => {
  const authenticatedRequest = request as AuthenticatedRequest;
  response.status(200).json({ data: { user: authenticatedRequest.user } });
});

export { apiRouter };
