import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IdPort } from '../../kernel/ports/id.port';

@Injectable()
export class UuidGenerator implements IdPort {
  generate(): string {
    return randomUUID();
  }
}
