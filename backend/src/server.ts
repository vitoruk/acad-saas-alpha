import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, ies: env.IES_NOME },
    `🚀 ACAD-SaaS API iniciada`,
  );
});

// Graceful shutdown
function shutdown(signal: string): void {
  logger.info({ signal }, 'Desligando servidor...');
  server.close(() => {
    logger.info('Servidor desligado');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
