import { env } from './config/env.js';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { startNotificationScheduler, stopNotificationScheduler } from './services/notificationScheduler.service.js';

let server;

const start = async () => {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
  });

  startNotificationScheduler();
};

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);

  stopNotificationScheduler();

  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      console.log('Shutdown complete');
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
