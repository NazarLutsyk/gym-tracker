import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC, type AuthUser } from './auth.decorators.js';

/** Registered globally (APP_GUARD): every route needs `Authorization: Bearer <token>` unless `@Public()`. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Потрібно увійти');
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: number }>(token);
      req.user = { id: sub };
    } catch {
      throw new UnauthorizedException('Сесія завершилась. Увійдіть знову');
    }
    return true;
  }
}
