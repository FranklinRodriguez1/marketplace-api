import { Inject, Injectable } from '@nestjs/common';
import type { AuthResult, SignUpInput } from '@cerca/contract';
import { ConflictError } from '../../../kernel/domain-error';
import { ID, type IdPort } from '../../../kernel/ports/id.port';
import { toActorResponse } from '../domain/user';
import { PASSWORD_HASHER, type PasswordHasher, USER_REPOSITORY, type UserRepository } from './ports';
import { SessionIssuer } from './session-issuer';

@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ID) private readonly ids: IdPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: SignUpInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError({ code: 'EMAIL_TAKEN', message: 'That email is already registered.' });
    }
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      id: this.ids.generate(),
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      capacities: input.capacities,
      platformRole: 'user',
    });
    const session = await this.sessions.issue(user);
    return { accessToken: session.accessToken, refreshToken: session.refreshToken, actor: toActorResponse(user) };
  }
}
