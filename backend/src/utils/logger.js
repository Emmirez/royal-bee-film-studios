import pino from 'pino';
import { env } from '../config/env.js';

const usePretty = !env.isProduction && !env.isTest;

export const logger = pino({
  level: env.isTest ? 'silent' : env.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.secret',
    ],
    censor: '[redacted]',
  },
  ...(usePretty
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
    : {}),
});
