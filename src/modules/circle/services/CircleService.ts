import { getAppConfig } from '@config/appConfig';
import globalLogger from '@core/logger/logger';

import type { ImageService, UploadResult } from '@modules/images/ImageService';

import type { CacheClient } from '../../../infrastructure/cloudflare/cloudflareClient';
import type { CircleRepository } from '../repositories/CircleRepository';
import type { Circle, NormalizedCircles } from '../types/Circle';
import hashCircleData from '../utils/hashCircleData';

export interface CircleService {
  getCircles: () => Promise<{ version: string; circles: NormalizedCircles }>;
  updateCircles: () => Promise<void>;
}

interface ImageToUpload {
  id: string;
  url: string;
  type: 'PROFILE' | 'SAMPLE_WORKS';
}

interface UploadedImagesLookup {
  url: string;
  sampleWorks: string[];
}

function createCircleService(
  circleRepository: CircleRepository,
  cacheClient: CacheClient,
  imageService: ImageService
): CircleService {
  let version: string = '';

  const logger = globalLogger.child({
    scope: 'CircleService'
  });

  const appConfig = getAppConfig();

  function insertUploadedImages(
    circle: Circle,
    uploadedImages: UploadResult<ImageToUpload>[]
  ) {
    const uploadedImageLookup = createUploadedImageLookup(uploadedImages);

    const data = uploadedImageLookup.get(circle.id);

    if (!data) return circle;

    return {
      ...circle,
      imageUrl: imageService.getSignedUrl(data.url, {
        width: 160,
        height: 160,
        resizeType: 'fit',
        quality: 80,
        sharpness: 0.7
      }),
      sampleWorks: data.sampleWorks.map((sampleWork) => {
        return imageService.getSignedUrl(sampleWork, {
          quality: 80
        });
      }),
      sampleWorkThumbnails: data.sampleWorks.map((sampleWork) => {
        return imageService.getSignedUrl(sampleWork, {
          quality: 80,
          width: 128,
          height: 128,
          resizeType: 'fill'
        });
      })
    };
  }

  async function getCircles() {
    const circles = await circleRepository.getCircles();

    if (!version) {
      version = `"${hashCircleData(circles).toString(16)}"`;
    }

    return {
      version,
      circles
    };
  }

  async function updateCircles() {
    try {
      logger.info('Scrapping circles...');
      const scrapedCircles = await circleRepository.scrapeCircles();
      logger.info('Scrapping circles complete');

      const existingCircles: NormalizedCircles = await circleRepository
        .getCircles()
        .catch(() => ({
          circles: [],
          fandoms: [],
          fillerCircles: []
        }));

      const imagesToUpload = createUploadImagesPayload(scrapedCircles);
      const uploadedImages = await imageService.uploadBatch(imagesToUpload);

      const circlesWithSignedImage: Circle[] = scrapedCircles.circles.map((circle) =>
        insertUploadedImages(circle, uploadedImages)
      );
      scrapedCircles.circles = circlesWithSignedImage;

      const scrapedCirclesHash = hashCircleData(scrapedCircles);
      const existingCirclesHash = hashCircleData(existingCircles);

      if (scrapedCirclesHash === existingCirclesHash) {
        logger.info('Existing and scraped circle is the same, noop');
        return;
      }

      logger.info('Existing and scraped circle is different, Syncing circles...');
      await circleRepository.syncCircles(scrapedCircles);

      version = `"${hashCircleData(scrapedCircles).toString(16)}"`;

      logger.info('Syncing circles complete');

      if (appConfig.environment === 'production') {
        const url = `${appConfig.origin}/api/v1/circles`;
        logger.info(`Purging cache: ${url}`);
        try {
          const res = await cacheClient.purgeUrls([url]);
          logger.info(`Purging cache complete, id: ${res?.id}`);
        } catch (e) {
          logger.error(`Purging cache failed: ${Error.isError(e) ? e : ''}`);
        }
      }
    } catch (e) {
      const message = Error.isError(e) ? e.message : 'Failed to scrape circles';
      logger.error(message);
    }
  }

  return {
    getCircles,
    updateCircles
  };
}

export default createCircleService;

function createUploadImagesPayload(normalizedCircles: NormalizedCircles) {
  const imagesToUpload: ImageToUpload[] = [];

  normalizedCircles.circles.forEach((circle) => {
    imagesToUpload.push({
      id: circle.id,
      url: circle.imageUrl ?? '',
      type: 'PROFILE'
    });

    circle.sampleWorks.forEach((sw) => {
      imagesToUpload.push({
        id: circle.id,
        url: sw ?? '',
        type: 'SAMPLE_WORKS'
      });
    });
  });

  return imagesToUpload;
}

function createUploadedImageLookup(
  uploadedImagesResult: UploadResult<ImageToUpload>[]
): Map<ImageToUpload['id'], UploadedImagesLookup> {
  const uploadedImagesLookup = new Map<ImageToUpload['id'], UploadedImagesLookup>();

  uploadedImagesResult.forEach((uploadedImage) => {
    if (!uploadedImagesLookup.has(uploadedImage.result.id)) {
      uploadedImagesLookup.set(uploadedImage.result.id, {
        url: '',
        sampleWorks: []
      });
    }

    const lookupData = uploadedImagesLookup.get(uploadedImage.result.id);

    if (lookupData) {
      if (uploadedImage.result.type === 'PROFILE') {
        lookupData.url = uploadedImage.result.url;
      } else if (uploadedImage.result.type === 'SAMPLE_WORKS') {
        lookupData.sampleWorks.push(uploadedImage.result.url);
      }
    }
  });

  return uploadedImagesLookup;
}
