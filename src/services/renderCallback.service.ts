import axios, { type AxiosInstance } from 'axios';
import type { GatewayEnv } from '../config/env';

type HttpClient = Pick<AxiosInstance, 'post'>;

export class AxiosRenderCallbackService {
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

  async relay(payload: Record<string, string>): Promise<void> {
    await this.http.post(this.env.RENDER_CALLBACK, payload, {
      headers: {
        'X-Internal-Token': this.env.INTERNAL_TOKEN,
        'Content-Type': 'application/json',
      },
    });
  }
}
