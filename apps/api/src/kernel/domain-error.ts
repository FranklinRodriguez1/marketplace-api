// Typed domain errors. Business code throws these; the global filter maps them ONCE to the
// RFC 9457 problem+json envelope. Never `throw new HttpException` in a use-case.

export type DomainErrorKind = 'not_found' | 'conflict' | 'forbidden' | 'unauthorized' | 'validation';

export const DOMAIN_ERROR_STATUS: Record<DomainErrorKind, number> = {
  validation: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
};

export interface DomainErrorProps {
  /** Stable, machine-readable code clients branch on, e.g. LISTING_NOT_FOUND. */
  code: string;
  message: string;
  /** Policy reason mirrored into problem+json `reason`, e.g. 'not_owner', 'already_reviewed'. */
  reason?: string;
  /** Validation issues, etc. Never SQL, stack traces, or internal hostnames. */
  details?: unknown;
}

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
  readonly code: string;
  readonly reason: string | undefined;
  readonly details: unknown;

  constructor(props: DomainErrorProps) {
    super(props.message);
    this.name = new.target.name;
    this.code = props.code;
    this.reason = props.reason;
    this.details = props.details;
  }
}

export class ValidationError extends DomainError {
  readonly kind = 'validation';
}
export class UnauthorizedError extends DomainError {
  readonly kind = 'unauthorized';
}
export class ForbiddenError extends DomainError {
  readonly kind = 'forbidden';
}
export class NotFoundError extends DomainError {
  readonly kind = 'not_found';
}
export class ConflictError extends DomainError {
  readonly kind = 'conflict';
}
