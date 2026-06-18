import { Router } from 'express';
import type { GatewayEnv } from '../config/env';
import { balanceController } from '../controllers/balance.controller';
import { callbackController } from '../controllers/callback.controller';
import { outputController } from '../controllers/output.controller';
import { payeeController } from '../controllers/payee.controller';
import { purchaseController } from '../controllers/purchase.controller';
import { requireInternalToken } from '../middlewares/auth';
import type { RenderCallbackService, WePayGatewayService } from '../types/wepay';

export interface WePayRoutesDeps {
  env: GatewayEnv;
  wepayService: WePayGatewayService;
  renderCallbackService: RenderCallbackService;
}

export const createWePayRouter = ({
  env,
  wepayService,
  renderCallbackService,
}: WePayRoutesDeps): Router => {
  const router = Router();
  const auth = requireInternalToken(env);

  router.post('/callback', callbackController(renderCallbackService));
  router.post('/balance', auth, balanceController(wepayService));
  router.post('/payee-info', auth, payeeController(wepayService));
  router.post('/purchase', auth, purchaseController(env, wepayService));
  router.post('/get-output', auth, outputController(wepayService));

  return router;
};
