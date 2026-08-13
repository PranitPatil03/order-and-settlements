import { betterAuth } from 'better-auth/minimal';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

import { database, mongoClient } from '../config/database.js';
import { env } from '../config/environment.js';

export const auth = betterAuth({
  database: mongodbAdapter(database(), { client: mongoClient }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [env.WEB_ORIGIN],
});
