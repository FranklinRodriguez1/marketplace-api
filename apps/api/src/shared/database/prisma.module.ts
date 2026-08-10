import { Global, Module } from '@nestjs/common';
import { TRANSACTION } from '../../kernel/ports/transaction.port';
import { PrismaService } from './prisma.service';
import { PrismaTransactionManager } from './prisma-transaction.manager';

@Global()
@Module({
  providers: [PrismaService, { provide: TRANSACTION, useClass: PrismaTransactionManager }],
  exports: [PrismaService, TRANSACTION],
})
export class PrismaModule {}
