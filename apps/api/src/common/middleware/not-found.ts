import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError('ROUTE_NOT_FOUND', `Route ${request.method} ${request.path} was not found.`, 404),
  );
};
