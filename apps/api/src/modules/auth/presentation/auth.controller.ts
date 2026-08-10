import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthResult } from '@cerca/contract';
import { Public } from '../../../shared/auth/public.decorator';
import { RefreshUseCase } from '../application/refresh.use-case';
import { SignInUseCase } from '../application/sign-in.use-case';
import { SignOutUseCase } from '../application/sign-out.use-case';
import { SignUpUseCase } from '../application/sign-up.use-case';
import { RefreshDto, SignInDto, SignOutDto, SignUpDto } from './dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly signOutUseCase: SignOutUseCase,
  ) {}

  @Public()
  @Post('sign-up')
  @HttpCode(201)
  signUp(@Body() dto: SignUpDto): Promise<AuthResult> {
    return this.signUpUseCase.execute(dto);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  signIn(@Body() dto: SignInDto): Promise<AuthResult> {
    return this.signInUseCase.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthResult> {
    return this.refreshUseCase.execute(dto.refreshToken);
  }

  @Post('sign-out')
  @HttpCode(204)
  async signOut(@Body() dto: SignOutDto): Promise<void> {
    await this.signOutUseCase.execute(dto.refreshToken);
  }
}
