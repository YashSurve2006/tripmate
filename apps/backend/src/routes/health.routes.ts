import { Router } from 'express';
import { prisma } from '../prisma';
import { sendSuccess } from '../utils/response';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  let dbStatus = 'DISCONNECTED';
  try {
    // Quick query to check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'CONNECTED';
  } catch (e: any) {
    dbStatus = 'OFFLINE_OR_UNREACHABLE';
  }

  return sendSuccess(res, {
    status: 'HEALTHY',
    service: 'tripmate-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
  });
});
