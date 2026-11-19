import {
  authResponseSchema,
  loginSchema,
  registerSchema,
  userSchema,
  type LoginInput,
  type RegisterInput,
} from '@gym/shared';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, type AuthUser } from './auth.decorators.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiCreatedResponse({ standardSchema: authResponseSchema })
  register(@Body({ schema: registerSchema }) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: authResponseSchema })
  login(@Body({ schema: loginSchema }) body: LoginInput) {
    return this.auth.login(body);
  }

  @Get('me')
  @ApiOkResponse({ standardSchema: userSchema })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
