import { Inject, Injectable } from '@nestjs/common';
import type { AuthResult, SignInInput } from '@cerca/contract';
import { ForbiddenError, UnauthorizedError } from '../../../kernel/domain-error';
import { toActorResponse } from '../domain/user';
import { PASSWORD_HASHER, type PasswordHasher, USER_REPOSITORY, type UserRepository } from './ports';
import { SessionIssuer } from './session-issuer';

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: SignInInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    // Identical response for unknown user and wrong password (no user enumeration).
    const ok = user ? await this.hasher.verify(user.passwordHash, input.password) : false;
    if (!user || !ok) {
      throw new UnauthorizedError({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }
    if (user.suspendedAt) {
      throw new ForbiddenError({ code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended.', reason: 'suspended' });
    }
    const session = await this.sessions.issue(user);
    return { accessToken: session.accessToken, refreshToken: session.refreshToken, actor: toActorResponse(user) };
  }
}
