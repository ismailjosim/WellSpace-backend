import type { Request, Response } from 'express';
import { prisma } from '@/config/prisma.config';
import { envVars } from '@/config/env';

const checkHealth = async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  let database: 'up' | 'down' = 'up';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }

  const statusCode = database === 'up' ? 200 : 503;

  res.status(statusCode).json({
    success: database === 'up',
    status: database === 'up' ? 'ok' : 'degraded',
    service: 'wellspace-api',
    environment: envVars.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database,
    },
    responseTimeMs: Date.now() - startedAt,
  });
};

export const HealthController = {
  checkHealth,
};
