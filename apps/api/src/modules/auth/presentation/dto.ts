import { refreshSchema, signInSchema, signOutSchema, signUpSchema } from '@cerca/contract';
import { createZodDto } from 'nestjs-zod';

export class SignUpDto extends createZodDto(signUpSchema) {}
export class SignInDto extends createZodDto(signInSchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
export class SignOutDto extends createZodDto(signOutSchema) {}
