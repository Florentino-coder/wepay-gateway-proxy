import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/index';
import { WEPAY_CLIENT_API_URL, getGatewayCallbackUrl } from '../src/constants/wepay';
import { md5 } from '../src/utils/md5';
import { WePayService } from '../src/services/wepay.service';
import type { GatewayEnv } from '../src/config/env';

const env: GatewayEnv = {
  PORT: 3000,
  INTERNAL_TOKEN: 'internal-test-token',
  WEPAY_USERNAME: 'unit-user',
  WEPAY_PASSWORD: 'unit-pass',
  RENDER_CALLBACK: 'https://api.termwai.in.th/api/wepay/callback',
  PUBLIC_BASE_URL: 'https://proxy.termwai.in.th',
};

describe('gateway security and constants', () => {
  it('locks wePAY upstream URL and derives callback URL', () => {
    expect(WEPAY_CLIENT_API_URL).toBe('https://www.wepay.in.th/client_api.json.php');
    expect(getGatewayCallbackUrl(env.PUBLIC_BASE_URL)).toBe('https://proxy.termwai.in.th/wepay/callback');
  });

  it('rejects internal routes without X-Internal-Token', async () => {
    const wepayService = { postToWePay: vi.fn() };
    const app = createApp({ env, wepayService });

    const response = await request(app).post('/wepay/balance').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
    expect(wepayService.postToWePay).not.toHaveBeenCalled();
  });
});

describe('wePAY service', () => {
  it('adds username and fresh MD5 password_hash and posts only to fixed wePAY URL', async () => {
    const post = vi.fn().mockResolvedValue({ data: { code: '00000' } });
    const service = new WePayService(env, { post });

    const result = await service.postToWePay({ type: 'balance_inquiry', url: 'https://evil.example' });

    expect(result).toEqual({ code: '00000' });
    expect(post).toHaveBeenCalledWith(WEPAY_CLIENT_API_URL, {
      username: 'unit-user',
      password_hash: md5('unit-pass'),
      type: 'balance_inquiry',
    });
  });
});

describe('gateway routes', () => {
  it('sends balance inquiry to wePAY and returns provider response unchanged', async () => {
    const wepayService = {
      postToWePay: vi.fn().mockResolvedValue({ code: '00000', available_balance: 100 }),
    };
    const app = createApp({ env, wepayService });

    const response = await request(app)
      .post('/wepay/balance')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: '00000', available_balance: 100 });
    expect(wepayService.postToWePay).toHaveBeenCalledWith({ type: 'balance_inquiry' });
  });

  it('forces purchase resp_url to gateway callback URL', async () => {
    const wepayService = {
      postToWePay: vi.fn().mockResolvedValue({ code: '00000', transaction_id: 'TXN-1' }),
    };
    const app = createApp({ env, wepayService });

    const response = await request(app)
      .post('/wepay/purchase')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send({
        dest_ref: 'ORDER00001',
        type: 'cashcard',
        pay_to_company: 'ROV',
        pay_to_amount: '150',
        pay_to_ref1: '0000000000',
        resp_url: 'https://api.termwai.in.th/api/wepay/callback',
      });

    expect(response.status).toBe(200);
    expect(wepayService.postToWePay).toHaveBeenCalledWith({
      dest_ref: 'ORDER00001',
      type: 'cashcard',
      pay_to_company: 'ROV',
      pay_to_amount: '150',
      pay_to_ref1: '0000000000',
      resp_url: 'https://proxy.termwai.in.th/wepay/callback',
    });
  });

  it('validates get-output transaction_id and forces get_output type', async () => {
    const wepayService = {
      postToWePay: vi.fn().mockResolvedValue({ code: '00000', output: 'status=2' }),
    };
    const app = createApp({ env, wepayService });

    const response = await request(app)
      .post('/wepay/get-output')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send({ transaction_id: '12345', type: 'ignored' });

    expect(response.status).toBe(200);
    expect(wepayService.postToWePay).toHaveBeenCalledWith({
      transaction_id: '12345',
      type: 'get_output',
    });
  });

  it('rejects payee-info without pay_to_company', async () => {
    const wepayService = { postToWePay: vi.fn() };
    const app = createApp({ env, wepayService });

    const response = await request(app)
      .post('/wepay/payee-info')
      .set('X-Internal-Token', env.INTERNAL_TOKEN)
      .send({ type: 'mtopup', payee_info: true });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('pay_to_company is required');
    expect(wepayService.postToWePay).not.toHaveBeenCalled();
  });
});

describe('callback relay', () => {
  it('relays form callback to Render and responds with DEST_REF on success', async () => {
    const renderCallbackService = {
      relay: vi.fn().mockResolvedValue(undefined),
    };
    const app = createApp({
      env,
      wepayService: { postToWePay: vi.fn() },
      renderCallbackService,
    });

    const response = await request(app)
      .post('/wepay/callback')
      .type('form')
      .send({
        dest_ref: 'ORDER00001',
        transaction_id: '12345',
        status: '2',
        sms: 'ok',
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('SUCCEED|DEST_REF=ORDER00001');
    expect(renderCallbackService.relay).toHaveBeenCalledWith({
      dest_ref: 'ORDER00001',
      transaction_id: '12345',
      status: '2',
      sms: 'ok',
    });
  });

  it('returns relay failure so wePAY can retry', async () => {
    const renderCallbackService = {
      relay: vi.fn().mockRejectedValue(new Error('relay failed')),
    };
    const app = createApp({
      env,
      wepayService: { postToWePay: vi.fn() },
      renderCallbackService,
    });

    const response = await request(app)
      .post('/wepay/callback')
      .type('form')
      .send({
        dest_ref: 'ORDER00002',
        transaction_id: '67890',
        status: '4',
      });

    expect(response.status).toBe(502);
    expect(response.text).toBe('ERROR|RELAY_FAILED');
  });
});
