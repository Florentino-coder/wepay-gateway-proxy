export type WePayPayload = Record<string, string | number | boolean>;

export interface WePayGatewayService {
  postToWePay(payload: WePayPayload): Promise<unknown>;
}

export interface RenderCallbackService {
  relay(payload: Record<string, string>): Promise<void>;
}
