import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { TransactionPort } from '../../kernel/ports/transaction.port';
import { PrismaService } from './prisma.service';
import { TX_KEY, type PrismaTx } from './tx';

// Stores the transaction client in AsyncLocalStorage (CLS) so repositories transparently
// join the active transaction. A nested run() joins rather than opening a second transaction.
@Injectable()
export class PrismaTransactionManager implements TransactionPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.cls.get(TX_KEY)) return work(); // already inside one: join it
    return this.prisma.$transaction(async (tx) => {
      this.cls.set(TX_KEY, tx as PrismaTx);
      try {
        return await work();
      } finally {
        this.cls.set(TX_KEY, undefined);
      }
    });
  }
}
