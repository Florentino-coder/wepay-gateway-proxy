import type { Request, Response } from 'express';
import type { RenderCallbackService } from '../types/wepay';
import { logger } from '../middlewares/requestLogger';
import { redact } from '../utils/redact';

const toStringPayload = (body: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(body || {}).map(([key, value]) => [
      key,
      value === undefined || value === null ? '' : String(value),
    ])
  );

export const callbackController =
  (renderCallbackService: RenderCallbackService) =>
  async (req: Request, res: Response) => {
    const payload = toStringPayload(req.body);
    const destRef = String(payload.dest_ref || '').trim();
    const transactionId = String(payload.transaction_id || '').trim();
    const status = String(payload.status || '').trim();

    if (!destRef || !transactionId || !status) {
      return res.status(400).type('text/plain').send('ERROR|INVALID_PAYLOAD');
    }

    logger.info({
      event: 'wepay_callback',
      dest_ref: destRef,
      transaction_id: transactionId,
      status,
      payload: redact(payload),
    });

    try {
      await renderCallbackService.relay(payload);
      return res.type('text/plain').send(`SUCCEED|DEST_REF=${destRef}`);
    } catch (error) {
      logger.error({
        event: 'wepay_callback_relay_failed',
        dest_ref: destRef,
        transaction_id: transactionId,
        status,
        message: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).type('text/plain').send('ERROR|RELAY_FAILED');
    }
  };
