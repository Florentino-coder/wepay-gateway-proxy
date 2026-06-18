import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { loadEnv, type GatewayEnv } from './config/env';
import { requestLogger, logger } from './middlewares/requestLogger';
import { createWePayRouter } from './routes/wepay.routes';
import { AxiosRenderCallbackService } from './services/renderCallback.service';
import { WePayService } from './services/wepay.service';
import type { RenderCallbackService, WePayGatewayService } from './types/wepay';

export interface CreateAppOptions {
  env?: GatewayEnv;
  wepayService?: WePayGatewayService;
  renderCallbackService?: RenderCallbackService;
}

export const createApp = (options: CreateAppOptions = {}): Express => {
  const env = options.env || loadEnv();
  const wepayService = options.wepayService || new WePayService(env);
  const renderCallbackService =
    options.renderCallbackService || new AxiosRenderCallbackService(env);

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(requestLogger);

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    '/wepay',
    createWePayRouter({ env, wepayService, renderCallbackService })
  );

  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      logger.error({
        event: 'request_failed',
        message: error instanceof Error ? error.message : String(error),
      });
      res.status(502).json({ error: 'Gateway request failed' });
    }
  );

  return app;
};

if (require.main === module) {
  const env = loadEnv();
  const app = createApp({ env });
  const server = app.listen(env.PORT, () => {
    logger.info({ event: 'server_started', port: env.PORT });
  });

  const shutdown = (signal: string) => {
    logger.info({ event: 'server_shutdown', signal });
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
