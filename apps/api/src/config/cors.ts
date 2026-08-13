import cors from 'cors';

import { env } from './environment.js';

export const corsMiddleware = cors({
  origin: env.WEB_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
