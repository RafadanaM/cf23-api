export type AppEnvironment = 'production' | 'development';

export type AppConfig = {
  environment: AppEnvironment;
  port: string;
  commitHash: string;
  origin: string;
  cfAPIKey: string;
  cfZoneId: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3APIEndpoint: string;
  s3BucketName: string;
  imgProxyBaseUrl: string;
  imgProxyKey: string;
  imgProxySalt: string;
};
