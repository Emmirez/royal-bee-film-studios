import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri = env.mongoUri) {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));

  await mongoose.connect(uri, { autoIndex: !env.isProduction });
  logger.info('MongoDB connected');
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export const dbState = () =>
  ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ||
  'unknown';
