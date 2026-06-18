const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'internal_token',
  'password',
  'password_hash',
  'token',
  'username',
  'x-internal-token',
]);

export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => redact(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(item),
      ])
    );
  }

  return value;
};
