import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

type RequestWithId = Request & { requestId?: string };

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestWithId = req as RequestWithId;
  const requestId =
    (req.headers['x-request-id'] as string | undefined)?.slice(0, 80) || randomUUID();
  const startedAt = Date.now();

  requestWithId.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const logPayload = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 500) {
      console.error('[request]', logPayload);
    } else if (res.statusCode >= 400) {
      console.warn('[request]', logPayload);
    } else {
      console.info('[request]', logPayload);
    }
  });

  next();
};

export default requestLogger;
