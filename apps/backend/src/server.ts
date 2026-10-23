import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 TripMate Backend API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`📡 Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });

  // Force shutdown if taking longer than 10s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
