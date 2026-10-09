import { z } from 'zod';

export const AppEnv = z.object({
  APP_PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['production', 'development']).default('development'),
  COMMIT_HASH: z.string().default('development'),
  ORIGIN: z.string().default('http://localhost:3000'),
  CLOUDFLARE_ZONE_ID: z.string().default(''),
  CLOUDFLARE_API_TOKEN: z.string().default(''),
  APP_S3_ACCESS_KEY_ID: z.string(),
  APP_S3_SECRET_ACCESS_KEY: z.string(),
  S3_API_ENDPOINT: z.string(),
  S3_BUCKET_NAME: z.string(),
  IMGPROXY_BASE_URL: z.string(),
  IMGPROXY_KEY: z.string(),
  IMGPROXY_SALT: z.string()
});

export type AppEnvSchema = z.infer<typeof AppEnv>;
