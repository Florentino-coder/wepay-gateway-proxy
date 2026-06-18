import type { Request, Response, NextFunction } from 'express';
import type { GatewayEnv } from '../config/env';
import { getGatewayCallbackUrl } from '../constants/wepay';
import type { WePayGatewayService, WePayPayload } from '../types/wepay';

const OMITTED_KEYS = new Set(['url', 'username', 'password', 'password_hash']);

const requiredFields = [
  'dest_ref',
  'type',
  'pay_to_company',
  'pay_to_amount',
  'pay_to_ref1',
];

export const purchaseController =
  (env: GatewayEnv, wepayService: WePayGatewayService) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const field of requiredFields) {
        if (!String(req.body?.[field] || '').trim()) {
          return res.status(400).json({ error: `${field} is required` });
        }
      }

      const payload = Object.fromEntries(
        Object.entries(req.body || {}).filter(([key]) => !OMITTED_KEYS.has(key))
      ) as WePayPayload;
      payload.resp_url = getGatewayCallbackUrl(env.PUBLIC_BASE_URL);

      const result = await wepayService.postToWePay(payload);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
