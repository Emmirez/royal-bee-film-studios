import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (_req, res) =>
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' },
  });

const make = (windowMs, limit, keyGenerator) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    ...(keyGenerator ? { keyGenerator } : {}),
  });

export const generalLimiter = make(15 * 60 * 1000, 600);
export const authLimiter = make(15 * 60 * 1000, 20);
export const passwordResetLimiter = make(60 * 60 * 1000, 5);
export const publicFormLimiter = make(60 * 60 * 1000, 15);
export const publicUploadLimiter = make(60 * 60 * 1000, 20);
export const searchLimiter = make(60 * 1000, 60);
export const trackingLimiter = make(60 * 1000, 120);
