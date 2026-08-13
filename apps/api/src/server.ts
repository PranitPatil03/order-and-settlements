import { app } from './app.js';
import { env } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './common/logger.js';
import { ensureOrderIndexes } from './modules/orders/repository.js';

const start = async () => {
  await connectDatabase();
  await ensureOrderIndexes();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API server started');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'API server shutting down');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((error: unknown) => {
  logger.fatal({ error }, 'API server failed to start');
  process.exit(1);
});
