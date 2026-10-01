import request from 'supertest';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/index';
import type { GatewayEnv } from '../src/config/env';

const env: GatewayEnv = {
  PORT: 3000,
  INTERNAL_TOKEN: 'internal-test-token',
  WEPAY_USERNAME: 'unit-user',
  WEPAY_PASSWORD: 'unit-pass',
  RENDER_CALLBACK: 'https://api.termwai.in.th/api/wepay/callback',
  PUBLIC_BASE_URL: 'https://proxy.termwai.in.th',
};

const purchase = {
  dest_ref: 'ORDER00009',
  type: 'gtopup',
  pay_to_company: 'ROV-M',
  pay_to_amount: '35',
  pay_to_ref1: '1234567890',
};

const upstreamError = (status: number, data: unknown) => {
  const error = new AxiosError('Request failed with status code ' + status);
  error.response = { status, data, statusText: '', headers: {}, config: {} as never };
  return error;
};

describe('upstream error passthrough', () => {
  it('returns the wePAY code and description when wePAY answers with an error status', async () => {
    const wepayService = {
      postToWePay: vi.fn().mockRejectedValue(upstreamError(400, { code: '30009', desc: 'Invalid ref1' })),
    };
    const response = await request(createApp({ env, wepayService }))
      .post('/wepay/purchase')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send(purchase);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'wePAY rejected the request',
      upstreamStatus: 400,
      code: '30009',
      desc: 'Invalid ref1',
      upstream: { code: '30009', desc: 'Invalid ref1' },
    });
  });

  it('keeps a short excerpt when wePAY answers with text', async () => {
    const wepayService = {
      postToWePay: vi.fn().mockRejectedValue(upstreamError(500, 'ERROR|INTERNAL')),
    };
    const response = await request(createApp({ env, wepayService }))
      .post('/wepay/purchase')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send(purchase);

    expect(response.body.upstreamStatus).toBe(500);
    expect(response.body.upstream).toEqual({ raw: 'ERROR|INTERNAL' });
  });

  it('keeps the generic answer when the request never reached wePAY', async () => {
    const wepayService = { postToWePay: vi.fn().mockRejectedValue(new Error('socket hang up')) };
    const response = await request(createApp({ env, wepayService }))
      .post('/wepay/purchase')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send(purchase);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Gateway request failed' });
  });
});
