import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { testConnection } from './db/pool';

const startServer = async () => {
  // Test Database Connection
  await testConnection();

  const server = app.listen(env.PORT, '::', () => {
    logger.info(`🚀 Server running on http://[::]:${env.PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
};

startServer();
