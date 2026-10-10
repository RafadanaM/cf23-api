import globalLogger from '@core/logger/logger';
import createTaskQueue from '@modules/common/utils/TaskQueue';

import { generateUrl } from '@imgproxy/imgproxy-js-core';
import type { ImageCacheRepository } from './ImageCacheRepository';
import type { ImageRepository } from './ImageRepository';

export interface UploadResult<T> {
  status: 'SUCCESS' | 'FAILED';
  result: T;
}

interface ImageUpload {
  url: string;
}

interface ImageTransformationOptions {
  quality?: number;
  resizeType?: 'fit' | 'fill';
  width?: number;
  height?: number;
  sharpness?: number;
}

interface Config {
  baseUrl: string;
  key: string;
  salt: string;
  bucketName: string;
}

interface UploadValue {
  url: string;
  status: 'EMPTY' | 'CACHED' | 'EXISTS' | 'UPLOADED';
}

export interface ImageService {
  upload(imageUrl: string): Promise<UploadValue>;
  uploadBatch<T extends ImageUpload>(imageUploads: T[]): Promise<UploadResult<T>[]>;
  getSignedUrl(objectKey: string, options?: ImageTransformationOptions): string;
}

function createImageService(
  imageRepository: ImageRepository,
  imageCacheRepository: ImageCacheRepository,
  config: Config
): ImageService {
  const logger = globalLogger.child({
    scope: 'ImageService'
  });

  const logMemory = (label: string) => {
    const mb = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    logger.info(`[Memory] ${label}: ${mb} MB`);
  };

  const keyBuffer = Buffer.from(config.key, 'hex');
  const saltBuffer = Buffer.from(config.salt, 'hex');

  async function upload(imageUrl: string): Promise<UploadValue> {
    if (!imageUrl)
      return {
        url: '',
        status: 'EMPTY'
      };
    const objectKey = getObjectKey(imageUrl);

    const isInCache = imageCacheRepository.has(objectKey);

    if (isInCache) {
      return {
        url: objectKey,
        status: 'CACHED'
      };
    }

    if (await imageRepository.fileExist(objectKey)) {
      imageCacheRepository.set(objectKey);

      return {
        url: objectKey,
        status: 'EXISTS'
      };
    }

    const response = await fetch(imageUrl);

    logger.info(`${objectKey} does not exists in cache, uploading..`);
    if (!response.ok) {
      logger.error(`${objectKey} failed to fetch`);
      throw new Error(`${imageUrl} failed with HTTP status of ${response.status}`);
    }

    // Passing ArrayBuffer instead of raw response seems to fix the memory issue when most images need to be uploaded
    const data = await response.arrayBuffer();
    await imageRepository.write(objectKey, data);
    imageCacheRepository.set(objectKey);

    return {
      url: objectKey,
      status: 'UPLOADED'
    };
  }

  async function uploadBatch<T extends ImageUpload>(
    imageUploads: T[]
  ): Promise<UploadResult<T>[]> {
    logger.info(`Uploading images: ${imageUploads.length}`);
    const taskQueue = createTaskQueue({ concurrency: 15 });

    logMemory('Before Batch');
    const promises: Promise<UploadValue>[] = [];

    for (const imageUpload of imageUploads) {
      await taskQueue.ready();

      promises.push(taskQueue.enqueue(() => upload(imageUpload.url)));
    }

    const results = await Promise.allSettled(promises);

    logMemory('After Batch');

    let cachedCount = 0;
    let existsCount = 0;
    let uploadedCount = 0;
    let emptyCount = 0;
    const errors: string[] = [];

    results.forEach((res, idx) => {
      if (res.status === 'rejected') {
        errors.push(imageUploads[idx]!.url);
      } else {
        if (res.value.status === 'EMPTY') {
          emptyCount++;
        } else if (res.value.status === 'CACHED') {
          cachedCount++;
        } else if (res.value.status === 'EXISTS') {
          existsCount++;
        } else {
          uploadedCount++;
        }
      }
    });

    logger.info(
      `cached: ${cachedCount}, exists: ${existsCount}, uploaded: ${uploadedCount}, empty: ${emptyCount}, error: ${errors.length}`
    );

    if (errors.length) {
      logger.warn(`Following images failed: ${errors.join(',')}`);
    }

    return results.map((res, idx) => toUploadResult(res, imageUploads[idx]!));
  }

  function getSignedUrl(objectKey: string, options?: ImageTransformationOptions): string {
    const hasWidthOrHeight = options?.width || options?.height;
    const quality = options?.quality || 80;
    const resizing_type = options?.resizeType;
    const sh = options?.sharpness;

    const path = generateUrl(
      {
        value: toBase64URL(objectKey, config.bucketName),
        type: 'base64'
      },
      {
        quality,
        resize: hasWidthOrHeight
          ? {
              resizing_type,
              width: options?.width,
              height: options?.height
            }
          : undefined,
        ext: 'webp',
        f: 'webp',
        sh,
        g: {
          type: 'sm'
        }
      }
    );

    const hasher = new Bun.CryptoHasher('sha256', keyBuffer);
    hasher.update(saltBuffer);
    hasher.update(path);

    const signature = hasher.digest('base64url');

    return `${config.baseUrl}/${signature}${path}`;
  }

  return {
    upload,
    uploadBatch,
    getSignedUrl
  };
}

function getObjectKey(imageUrl: string): string {
  const cleanUrl = imageUrl.split('?')[0];
  const fileExt = cleanUrl?.split('.').pop() || 'jpg';

  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(imageUrl);
  const hashedUrl = hasher.digest('hex');

  return `circles/${hashedUrl}.${fileExt}`;
}

function toBase64URL(objectKey: string, bucketName: string) {
  const s3Uri = objectKey.startsWith('s3://')
    ? objectKey
    : `s3://${bucketName}/${objectKey}`;

  return Buffer.from(s3Uri).toString('base64url');
}

function toUploadResult<T extends ImageUpload>(
  result: PromiseSettledResult<UploadValue>,
  imageUpload: T
): UploadResult<T> {
  if (result.status === 'fulfilled') {
    return {
      status: 'SUCCESS',
      result: { ...imageUpload, url: result.value.url }
    };
  }

  return {
    status: 'FAILED',
    result: imageUpload
  };
}

export default createImageService;
