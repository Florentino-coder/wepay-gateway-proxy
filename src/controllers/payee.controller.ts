import type { Request, Response, NextFunction } from 'express';
import type { WePayGatewayService } from '../types/wepay';

export const payeeController =
  (wepayService: WePayGatewayService) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = String(req.body?.type || '').trim();
      const payToCompany = String(req.body?.pay_to_company || '').trim();

      if (!type) {
        return res.status(400).json({ error: 'type is required' });
      }

      if (!payToCompany) {
        return res.status(400).json({ error: 'pay_to_company is required' });
      }

      const result = await wepayService.postToWePay({
        type,
        pay_to_company: payToCompany,
        payee_info: true,
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
