export const WEPAY_CLIENT_API_URL =
  'https://www.wepay.in.th/client_api.json.php' as const;

export const getGatewayCallbackUrl = (publicBaseUrl: string): string =>
  `${publicBaseUrl.replace(/\/+$/, '')}/wepay/callback`;
