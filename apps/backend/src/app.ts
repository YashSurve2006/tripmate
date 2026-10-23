import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { expenseRouter } from './routes/expense.routes';
import { groupRouter } from './routes/group.routes';
import { healthRouter } from './routes/health.routes';
import { settlementRouter } from './routes/settlement.routes';
import { sendError } from './utils/response';

export function createApp(): Express {
  const app = express();

  // Core Security & Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Mount API v1 Routes
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/health`, healthRouter);
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/groups`, groupRouter);
  app.use(`${prefix}/groups/:groupId/expenses`, expenseRouter);
  app.use(`${prefix}/groups/:groupId/settlements`, settlementRouter);

  // 404 handler for undefined endpoints
  app.use('*', (req, res) => {
    sendError(res, `Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
