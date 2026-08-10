import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { ZodValidationException } from 'nestjs-zod';
import { DOMAIN_ERROR_STATUS, DomainError } from '../../kernel/domain-error';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  reason?: string;
  errors?: Array<{ path: string; message: string }>;
  traceId?: string;
}

// Every error becomes an RFC 9457 problem+json here, in ONE place. Domain errors are typed
// and mapped by kind; validation failures carry field issues; anything unmapped is a bug,
// logged with its stack and returned as a generic 500 with a traceId.
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const instance = http.getRequest<{ url?: string }>().url ?? '';
    const traceId = this.safeTraceId();
    const problem = this.toProblem(exception, instance, traceId);

    if (problem.status >= 500) {
      this.logger.error({ err: exception, traceId }, problem.title);
    }
    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, instance: string, traceId: string | undefined): ProblemDetails {
    if (exception instanceof DomainError) {
      const status = DOMAIN_ERROR_STATUS[exception.kind];
      return this.build({
        status,
        code: exception.code,
        title: humanTitle(exception.code),
        detail: exception.message,
        instance,
        traceId,
        ...(exception.reason ? { reason: exception.reason } : {}),
      });
    }

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as {
        issues?: Array<{ path: Array<string | number>; message: string }>;
      };
      const issues = zodError.issues ?? [];
      return this.build({
        status: 422,
        code: 'VALIDATION_ERROR',
        title: 'Validation failed',
        detail: 'One or more fields are invalid.',
        instance,
        traceId,
        errors: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return this.build({
        status,
        code: httpCode(status),
        title: exception.name,
        detail: exception.message,
        instance,
        traceId,
      });
    }

    return this.build({
      status: 500,
      code: 'INTERNAL_ERROR',
      title: 'Internal server error',
      detail: 'An unexpected error occurred.',
      instance,
      traceId,
    });
  }

  private build(p: Omit<ProblemDetails, 'type'>): ProblemDetails {
    return { type: `https://cerca.app/errors/${p.code}`, ...p };
  }

  private safeTraceId(): string | undefined {
    try {
      return this.cls.getId();
    } catch {
      return undefined;
    }
  }
}

function humanTitle(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function httpCode(status: number): string {
  return `HTTP_${status}`;
}
