import axios, { type AxiosInstance } from 'axios';
import type { GatewayEnv } from '../config/env';
import { WEPAY_CLIENT_API_URL } from '../constants/wepay';
import type { WePayPayload } from '../types/wepay';
import { md5 } from '../utils/md5';

type HttpClient = Pick<AxiosInstance, 'post'>;

const RESERVED_KEYS = new Set(['url', 'username', 'password', 'password_hash']);

export class WePayService {
  private readonly http: HttpClient;

  constructor(
    private readonly env: GatewayEnv,
    httpClient?: HttpClient
  ) {
    this.http =
      httpClient ||
      axios.create({
        timeout: 30000,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'User-Agent': 'TermWai-wePAY-Gateway/1.0',
        },
      });
  }

  async postToWePay(payload: WePayPayload): Promise<unknown> {
    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => !RESERVED_KEYS.has(key))
    ) as WePayPayload;

    const response = await this.http.post(WEPAY_CLIENT_API_URL, {
      username: this.env.WEPAY_USERNAME,
      password_hash: md5(this.env.WEPAY_PASSWORD),
      ...sanitizedPayload,
    });

    return response.data;
  }
}
