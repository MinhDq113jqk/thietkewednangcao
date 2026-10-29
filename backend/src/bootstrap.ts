import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { resolve } from 'node:path';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createCorsOptions } = require('./config/cors');
const compression = require('./common/middleware/compression');
const createRateLimit = require('./common/middleware/rateLimit');
const requestContext = require('./common/middleware/requestContext');
const requestLogger = require('./common/middleware/requestLogger');
const authRequestPolicy = require('./common/middleware/authRequestPolicy');
const { errorResponseFormatter } = require('./common/middleware/errorResponse');
const { assertAuthSecrets } = require('./utils/authTokens');

export async function createApplication(): Promise<NestExpressApplication> {
  assertAuthSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    abortOnError: false,
    logger: ['error', 'warn'],
  });
  app.use(requestContext);
  app.use(requestLogger);
  app.use(errorResponseFormatter);
  app.use(helmet());
  app.use('/api/auth', authRequestPolicy());
  app.use(cors(createCorsOptions()));
  app.use(compression);
  app.use(
    '/api',
    createRateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX || 300),
    }),
  );
  const authRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  });
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/request-verification'], authRateLimit);
  app.use(
    '/api/assistant',
    createRateLimit({ windowMs: 5 * 60 * 1000, max: 40 }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.useStaticAssets(process.env.UPLOAD_DIRECTORY || resolve(__dirname, '../uploads'), {
    prefix: '/uploads/',
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  try {
    await app.init();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
