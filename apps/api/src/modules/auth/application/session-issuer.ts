import { Inject, Injectable } from '@nestjs/common';
import { env } from '../../../config/env';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { ID, type IdPort } from '../../../kernel/ports/id.port';
import { TokenService } from '../../../shared/auth/token.service';
import { toActor, type UserRecord } from '../domain/user';
import { generateRefreshToken, hashRefreshToken, parseDurationMs } from '../infrastructure/crypto';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './ports';

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
}

// Issues an access token (short-lived JWT) plus a rotating refresh token (opaque, stored
// hashed). A rotation stays in the same `familyId` so reuse of a consumed token is detectable.
@Injectable()
export class SessionIssuer {
  private readonly refreshTtlMs = parseDurationMs(env.JWT_REFRESH_TTL);

  constructor(
    private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(ID) private readonly ids: IdPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async issue(user: UserRecord, familyId?: string): Promise<IssuedSession> {
    const accessToken = this.tokens.signAccess(toActor(user));
    const rawRefresh = generateRefreshToken();
    const refreshTokenId = this.ids.generate();
    const expiresAt = new Date(this.clock.now().getTime() + this.refreshTtlMs);

    await this.refreshTokens.create({
      id: refreshTokenId,
      userId: user.id,
      familyId: familyId ?? this.ids.generate(),
      tokenHash: hashRefreshToken(rawRefresh),
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefresh, refreshTokenId };
  }
}
