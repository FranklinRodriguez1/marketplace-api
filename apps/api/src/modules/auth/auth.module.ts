import { Module } from '@nestjs/common';
import { AddProviderCapacityUseCase } from './application/add-provider-capacity.use-case';
import { PASSWORD_HASHER, REFRESH_TOKEN_REPOSITORY, USER_REPOSITORY } from './application/ports';
import { RefreshUseCase } from './application/refresh.use-case';
import { SessionIssuer } from './application/session-issuer';
import { SignInUseCase } from './application/sign-in.use-case';
import { SignOutUseCase } from './application/sign-out.use-case';
import { SignUpUseCase } from './application/sign-up.use-case';
import { SuspendUserUseCase } from './application/suspend-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';
import { MeController } from './presentation/me.controller';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [AuthController, MeController, UsersController],
  providers: [
    SignUpUseCase,
    SignInUseCase,
    RefreshUseCase,
    SignOutUseCase,
    AddProviderCapacityUseCase,
    SuspendUserUseCase,
    SessionIssuer,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  ],
})
export class AuthModule {}
