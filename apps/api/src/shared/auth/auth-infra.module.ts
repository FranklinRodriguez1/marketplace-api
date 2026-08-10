import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../config/env';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PolicyGuard } from './policy.guard';
import { TokenService } from './token.service';

// Binds the two global guards in order: authenticate (JwtAuthGuard) → authorize capability
// (PolicyGuard). Exports TokenService + JwtModule for the auth feature module.
@Global()
@Module({
  imports: [JwtModule.register({ secret: env.JWT_SECRET })],
  providers: [
    TokenService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
  exports: [TokenService, JwtModule],
})
export class AuthInfraModule {}
