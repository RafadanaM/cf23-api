import { Elysia } from 'elysia';

import globalLogger from './logger';

const loggerPlugin = new Elysia({ name: 'logger-plugin' })
  .derive({ as: 'global' }, () => {
    const requestId = crypto.randomUUID();
    return {
      startTime: performance.now(),
      requestId,
      logger: globalLogger.child({ requestId })
    };
  })
  .onRequest(({ request }) => {
    request.startTime = performance.now();
  })
  .onAfterResponse(
    { as: 'global' },
    ({ logger: localLogger, request, set, path, startTime }) => {
      if (set.status && typeof set.status === 'number' && set.status >= 400) {
        return;
      }

      const logger = localLogger ?? globalLogger;
      logger.info({
        method: request.method,
        path,
        status: set.status,
        duration: performance.now() - (startTime || 0)
      });
    }
  )
  .onError(
    { as: 'global' },
    ({ code, set, error, logger: localLogger, request, path, startTime }) => {
      const logger = localLogger ?? globalLogger;

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
    }
  );

export default loggerPlugin;
