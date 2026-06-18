import type { Request, Response, NextFunction } from 'express';
import type { WePayGatewayService } from '../types/wepay';

export const balanceController =
  (wepayService: WePayGatewayService) =>
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await wepayService.postToWePay({
        type: 'balance_inquiry',
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
