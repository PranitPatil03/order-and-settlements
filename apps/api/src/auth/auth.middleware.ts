import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from './auth.js';
import { AppError } from '../common/errors/app-error.js';

export type AuthenticatedRequest = Request & {
  user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user'];
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['session'];
};

export const requireAuth = async (request: Request, _response: Response, next: NextFunction) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    next(new AppError('AUTH_REQUIRED', 'Authentication is required.', 401));
    return;
  }

  Object.assign(request, { user: session.user, session: session.session });
  next();
};
