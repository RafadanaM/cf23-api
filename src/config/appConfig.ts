import type { AppEnvSchema } from './env';
import type { AppConfig } from './types';

let appConfigInstance: AppConfig | null = null;

export function createAppConfig(env: AppEnvSchema): AppConfig {
  if (appConfigInstance) {
    throw new Error('App Config has been instantiated!');
  }
  appConfigInstance = {
    port: env.APP_PORT,
    environment: env.NODE_ENV,
    commitHash: env.COMMIT_HASH,
    origin: env.ORIGIN,
    cfAPIKey: env.CLOUDFLARE_API_TOKEN,
    cfZoneId: env.CLOUDFLARE_ZONE_ID,
    s3AccessKeyId: env.APP_S3_ACCESS_KEY_ID,
    s3SecretAccessKey: env.APP_S3_SECRET_ACCESS_KEY,
    s3APIEndpoint: env.S3_API_ENDPOINT,
    s3BucketName: env.S3_BUCKET_NAME,
    imgProxyBaseUrl: env.IMGPROXY_BASE_URL,
    imgProxyKey: env.IMGPROXY_KEY,
    imgProxySalt: env.IMGPROXY_SALT
  };

  return appConfigInstance;
}

export function getAppConfig() {
  if (!appConfigInstance) {
    throw new Error('AppConfig not instantiated! Call createAppConfig first!');
  }
  return appConfigInstance;
}
