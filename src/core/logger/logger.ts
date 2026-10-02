import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

type ALSContext = {
  requestId?: string;
  jobId?: string;
};

export const asyncLocalStorage = new AsyncLocalStorage<ALSContext>();

const logger = pino({
  mixin: () => {
    const ctx = asyncLocalStorage.getStore();
    return ctx ? { requestId: ctx.requestId, jobId: ctx.jobId } : {};
  },
  level: process.env.LOG_LEVEL || 'info',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
});

export default logger;
