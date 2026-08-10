import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { env } from './config/env';

// One schema, three uses: the Zod contracts drive validation, types, AND this OpenAPI doc.
export function buildOpenApiDocument(app: INestApplication): ReturnType<typeof SwaggerModule.createDocument> {
  const config = new DocumentBuilder()
    .setTitle('Cerca API')
    .setDescription('Marketplace de servicios locales — API REST versionada (/v1).')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(env.PUBLIC_API_URL)
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

export function setupOpenApi(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });
}
