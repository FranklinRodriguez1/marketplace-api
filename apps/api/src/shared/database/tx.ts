import type { ClsService } from 'nestjs-cls';
import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from './prisma.service';

/** CLS key under which the ambient transaction client is stored for the request. */
export const TX_KEY = 'tx';

export type PrismaTx = Prisma.TransactionClient;
export type Db = PrismaService | PrismaTx;

/** Resolve the active DB handle: the ambient transaction if one is running, else the pool. */
export function dbClient(prisma: PrismaService, cls: ClsService): Db {
  return cls.get<PrismaTx | undefined>(TX_KEY) ?? prisma;
}
