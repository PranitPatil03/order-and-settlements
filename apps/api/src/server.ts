import { app } from './app.js';
import { env } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './common/logger.js';
import { ensureCustomerIndexes } from './modules/customers/repository.js';
import { ensureOrderIndexes } from './modules/orders/repository.js';
import { ensurePaymentIndexes } from './modules/payments/repository.js';
import { ensureRefundIndexes } from './modules/refunds/repository.js';
import { ensureAuditIndexes } from './modules/audit/service.js';

const start = async () => {
  await connectDatabase();
  await ensureCustomerIndexes();
  await ensureOrderIndexes();
  await ensurePaymentIndexes();
  await ensureRefundIndexes();
  await ensureAuditIndexes();

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
