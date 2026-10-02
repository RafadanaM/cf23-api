import { getAppConfig } from '@config/appConfig';
import globalLogger from '@core/logger/logger';

import type { CacheClient } from '../../../infrastructure/cloudflare/cloudflareClient';
import type { CircleRepository } from '../repositories/CircleRepository';
import type { NormalizedCircles } from '../types/Circle';
import hashCircleData from '../utils/hashCircleData';

export interface CircleService {
  getCircles: () => Promise<{ version: string; circles: NormalizedCircles }>;
  updateCircles: () => Promise<void>;
}

function createCircleService(
  circleRepository: CircleRepository,
  cacheClient: CacheClient
): CircleService {
  let version: string = '';

  const logger = globalLogger.child({
    scope: 'CircleService'
  });

  const appConfig = getAppConfig();

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

      const scrapedCirclesHash = hashCircleData(scrapedCircles);
      const existingCirclesHash = hashCircleData(existingCircles);

      if (scrapedCirclesHash === existingCirclesHash) {
        logger.info('Existing and scraped circle is the same, noop');
        return;
      }

      logger.info('Existing and scraped circle is different, Syncing circles...');

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
      logger.error(`${message}`);
    }
  }

  return {
    getCircles,
    updateCircles
  };
}

export default createCircleService;
