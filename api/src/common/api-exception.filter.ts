import type { ApiError } from '@gym/shared';
import {
  BadRequestException,
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

type Issue = { message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> };

/** For `StandardSchemaValidationPipe({ exceptionFactory })`: 400 with field-level `issues`. */
export const validationException = (issues: readonly Issue[]) =>
  new BadRequestException({
    message: 'Перевірте введені дані',
    issues: issues.map((issue) => ({
      path: (issue.path ?? [])
        .map((s) => String(typeof s === 'object' ? s.key : s))
        .join('.'),
      message: issue.message,
    })),
  });

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let body: ApiError;
    if (error instanceof HttpException) {
      const r = error.getResponse() as string | { message?: string | string[]; issues?: ApiError['issues'] };
      const message = typeof r === 'string' ? r : (r.message ?? error.message);
      body = {
        statusCode: error.getStatus(),
        message: Array.isArray(message) ? message.join('; ') : message,
        ...(typeof r === 'object' && r.issues && { issues: r.issues }),
      };
    } else {
      this.logger.error(error);
      body = { statusCode: 500, message: 'Помилка сервера. Спробуйте пізніше' };
    }
    res.status(body.statusCode).json(body);
  }
}
