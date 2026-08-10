// A use-case that saves several aggregates needs atomicity, but must not know about
// prisma.$transaction. It reads `await tx.run(async () => { ... })` and stays framework-free;
// repositories transparently join the ambient transaction via CLS.
export const TRANSACTION = Symbol('TRANSACTION');

export interface TransactionPort {
  run<T>(work: () => Promise<T>): Promise<T>;
}
