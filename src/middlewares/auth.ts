import type { NextFunction, Request, Response } from 'express';
import type { GatewayEnv } from '../config/env';

export const requireInternalToken =
  (env: GatewayEnv) => (req: Request, res: Response, next: NextFunction) => {
    if (req.header('X-Internal-Token') !== env.INTERNAL_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
  };
