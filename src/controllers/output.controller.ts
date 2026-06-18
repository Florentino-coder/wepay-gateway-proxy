import type { Request, Response, NextFunction } from 'express';
import type { WePayGatewayService } from '../types/wepay';

export const outputController =
  (wepayService: WePayGatewayService) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactionId = String(req.body?.transaction_id || '').trim();

      if (!transactionId) {
        return res.status(400).json({ error: 'transaction_id is required' });
      }

      const result = await wepayService.postToWePay({
        transaction_id: transactionId,
        type: 'get_output',
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
