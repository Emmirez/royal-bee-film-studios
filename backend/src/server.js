import { createApp } from './app.js';
import { env, assertRequiredEnv, integrations } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './utils/logger.js';

async function start() {
  assertRequiredEnv();
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`Royal Bee API listening on ${env.serverUrl}${env.apiPrefix}`);
    if (!integrations.cloudinaryConfigured()) logger.warn('Cloudinary not configured — media uploads are disabled until it is set up.');
    if (!integrations.brevoConfigured()) logger.warn('Brevo not configured — emails will be logged, not sent.');
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled promise rejection'));

start().catch((err) => {
  logger.fatal({ err }, err.message);
  process.exit(1);
});
