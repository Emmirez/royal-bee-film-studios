import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { generalLimiter } from './middleware/rateLimiters.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // correct client IPs behind a single reverse proxy / load balancer

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url.endsWith('/health') },
        customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
        serializers: { req: (req) => ({ method: req.method, url: req.url }), res: (res) => ({ statusCode: res.statusCode }) },
      }),
    );
  }

  // Staff/auth responses must never be cached by browsers or proxies.
  app.use(env.apiPrefix, (req, res, next) => {
    if (!req.path.startsWith('/public')) res.set('Cache-Control', 'no-store');
    next();
  });

   // Public images used inside emails (e.g. the logo). Email apps load these from other sites,
  // so they're allowed cross-origin and cached for a day.
  const emailAssets = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'email');
  app.use(
    '/email-assets',
    express.static(emailAssets, {
      maxAge: '1d',
      index: false,
      setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  app.use(env.apiPrefix, generalLimiter, routes);

  app.get('/', (_req, res) => res.json({ name: 'Royal Bee Film Studios API', docs: `${env.apiPrefix}/health` }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
