import { Global, Module } from '@nestjs/common';
import { AUDIT } from './audit.port';
import { PrismaAuditRepository } from './prisma-audit.repository';

@Global()
@Module({
  providers: [{ provide: AUDIT, useClass: PrismaAuditRepository }],
  exports: [AUDIT],
})
export class AuditModule {}
