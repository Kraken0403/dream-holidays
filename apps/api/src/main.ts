import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (response) => response.setHeader('Access-Control-Allow-Origin', '*'),
  });

  const frontendUrl =
    config.get<string>('FRONTEND_URL') || 'http://localhost:3001';

  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''));

  app.enableCors({
    origin: (origin, callback) => {
      /**
       * Allow requests with no origin:
       * - Postman
       * - curl
       * - server-to-server requests
       */
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      /**
       * Dev-only fallback:
       * Allows Nuxt dev server if it switches port or is opened by LAN IP.
       */
      const isLocalDev =
        /^http:\/\/localhost:\d+$/.test(normalizedOrigin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(normalizedOrigin) ||
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(normalizedOrigin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(normalizedOrigin) ||
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/.test(normalizedOrigin);

      if (isLocalDev) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = Number(config.get('PORT') || 6001);

  await app.listen(port, () => {
    console.log(`Dream Holidays API running on http://0.0.0.0:${port}/api`);
    console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  });
}

bootstrap();
