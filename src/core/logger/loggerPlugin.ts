import { Elysia } from 'elysia';

import logger, { asyncLocalStorage } from './logger';

const loggerPlugin = new Elysia({ name: 'logger-plugin' })
  .wrap((fn) => (...args: unknown[]) => {
    const requestId = crypto.randomUUID();

    return asyncLocalStorage.run({ requestId }, () => fn(...args));
  })
  .derive({ as: 'global' }, () => {
    return {
      startTime: performance.now()
    };
  })
  .onRequest(({ request }) => {
    request.startTime = performance.now();
  })
  .onAfterHandle({ as: 'global' }, ({ set }) => {
    set.headers['x-request-id'] = asyncLocalStorage.getStore()?.requestId ?? '';
  })
  .onAfterResponse({ as: 'global' }, ({ request, set, path, startTime }) => {
    if (set.status && typeof set.status === 'number' && set.status >= 400) {
      return;
    }

    logger.info({
      method: request.method,
      path,
      status: set.status,
      duration: performance.now() - (startTime || 0)
    });
  })
  .onError({ as: 'global' }, ({ code, set, error, request, path, startTime }) => {
    const errorCtx = {
      code,
      path,
      method: request.method,
      status: set.status,
      duration: performance.now() - (startTime || 0)
    };

    switch (code) {
      case 'NOT_FOUND':
        logger.warn(errorCtx);
        break;
      case 'VALIDATION':
        logger.warn({
          ...errorCtx,
          errors: error.all
        });
        break;

      case 'INVALID_FILE_TYPE':
      case 'INVALID_COOKIE_SIGNATURE':
      case 'PARSE':
        logger.warn({
          ...errorCtx,
          err: error
        });
        break;

      case 'UNKNOWN':
      case 'INTERNAL_SERVER_ERROR':
      default:
        {
          logger.error({
            ...errorCtx,
            err: error
          });
        }

        break;
    }
  });

export default loggerPlugin;
