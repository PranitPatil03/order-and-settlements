import express from 'express';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth/auth.js';
import { apiRouter } from './api/router.js';
import { corsMiddleware } from './config/cors.js';
import { errorHandler } from './common/middleware/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { requestLogger } from './common/middleware/request-logger.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(corsMiddleware);
app.use(requestLogger);

// Better Auth must receive the raw request before express.json() parses it.
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ data: { status: 'ok' } });
});

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
