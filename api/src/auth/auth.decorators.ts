import { createParamDecorator, SetMetadata } from '@nestjs/common';

export type AuthUser = { id: number };

export const IS_PUBLIC = 'isPublic';

/** Skips the global `AuthGuard` for a route or a whole controller. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx) => ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
