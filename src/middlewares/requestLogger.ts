import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { redact } from '../utils/redact';

export const logger = pino({
  level:
    process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
});

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info({
      event: 'http_request',
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Date.now() - startedAt,
      payload: redact(req.body),
    });
  });

  next();
};
