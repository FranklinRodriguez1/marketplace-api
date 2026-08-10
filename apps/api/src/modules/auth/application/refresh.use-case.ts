import { Inject, Injectable } from '@nestjs/common';
import type { AuthResult } from '@cerca/contract';
import { UnauthorizedError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import { toActorResponse } from '../domain/user';
import { hashRefreshToken } from '../infrastructure/crypto';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository, USER_REPOSITORY, type UserRepository } from './ports';
import { SessionIssuer } from './session-issuer';

// Rotation with reuse detection. Presenting an already-consumed (revoked) token means the
// token was stolen and replayed — the whole family is revoked. All of it runs in one
// transaction so a rotation cannot half-happen.
@Injectable()
export class RefreshUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(rawToken: string): Promise<AuthResult> {
    return this.tx.run(async () => {
      const now = this.clock.now();
      const token = await this.refreshTokens.findByHash(hashRefreshToken(rawToken));
      if (!token) {
        throw new UnauthorizedError({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.' });
      }
      if (token.revokedAt) {
        await this.refreshTokens.revokeFamily(token.familyId, now);
        throw new UnauthorizedError({
          code: 'REFRESH_TOKEN_REUSED',
          message: 'Refresh token reuse detected. The session family has been revoked.',
          reason: 'reuse_detected',
        });
      }
      if (token.expiresAt.getTime() <= now.getTime()) {
        throw new UnauthorizedError({ code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token expired.' });
      }
      const user = await this.users.findById(token.userId);
      if (!user || user.suspendedAt) {
        throw new UnauthorizedError({ code: 'ACCOUNT_UNAVAILABLE', message: 'Account is unavailable.' });
      }

      const session = await this.sessions.issue(user, token.familyId);
      await this.refreshTokens.markRotated(token.id, session.refreshTokenId, now);

      return { accessToken: session.accessToken, refreshToken: session.refreshToken, actor: toActorResponse(user) };
    });
  }
}
