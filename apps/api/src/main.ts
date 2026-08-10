import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { env } from './config/env';
import { setupOpenApi } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: [...env.CORS_ORIGINS], credentials: true });
  configureApp(app);
  app.enableShutdownHooks(); // SIGTERM → onModuleDestroy: drain, close Prisma + Redis.

  setupOpenApi(app);

  await app.listen(env.PORT, '0.0.0.0');
  const logger = app.get(Logger);
  logger.log(`Cerca API listening on :${env.PORT} (docs at /docs)`);
}

void bootstrap();
