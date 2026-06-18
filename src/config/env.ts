import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  INTERNAL_TOKEN: z.string().min(16),
  WEPAY_USERNAME: z.string().min(1),
  WEPAY_PASSWORD: z.string().min(1),
  RENDER_CALLBACK: z.string().url(),
  PUBLIC_BASE_URL: z.string().url(),
});

export type GatewayEnv = z.infer<typeof envSchema>;

export const loadEnv = (input: NodeJS.ProcessEnv = process.env): GatewayEnv =>
  envSchema.parse(input);
