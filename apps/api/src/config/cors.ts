import cors from 'cors';

import { env } from './environment.js';

const allowedOrigins = new Set([env.WEB_ORIGIN, env.BETTER_AUTH_URL].filter(Boolean));

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
