import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { hashRefreshToken } from '../infrastructure/crypto';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './ports';

@Injectable()
export class SignOutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(rawToken: string): Promise<void> {
    const token = await this.refreshTokens.findByHash(hashRefreshToken(rawToken));
    if (token && !token.revokedAt) {
      await this.refreshTokens.revoke(token.id, this.clock.now());
    }
  }
}
