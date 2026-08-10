import { type INestApplication, VersioningType } from '@nestjs/common';

// Shared app configuration applied by both main.ts and the e2e harness, so tests exercise the
// same URI versioning the real server uses.
export function configureApp(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}
