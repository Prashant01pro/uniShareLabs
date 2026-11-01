import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'MALFORMED_REQUEST'
  | 'MALFORMED_QUERY'
  | 'INVALID_STATE_TRANSITION'
  | 'AUTH_TOKEN_MISSING'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_TOKEN_REUSED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN_INSUFFICIENT_ROLE'
  | 'FORBIDDEN_OBJECT_ACCESS'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_INACTIVE'
  | 'EMAIL_ALREADY_EXISTS'
  | 'QUOTA_EXCEEDED'
  | 'COOLDOWN_ACTIVE'
  | 'RESOURCE_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'NOT_FOUND'
  | 'SLOT_COLLISION'
  | 'IDEMPOTENCY_IN_FLIGHT'
  | 'MAINTENANCE_OVERLAP'
  | 'CONFLICT_ERROR'
  | 'WAITLIST_OFFER_EXPIRED'
  | 'IDEMPOTENCY_PAYLOAD_MISMATCH'
  | 'METER_ROLLBACK_ERROR'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

export interface IFieldError {
  field: string;
  message: string;
}

export interface IProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: ErrorCode | string;
  errors?: IFieldError[];
  timestamp: string;
  stack?: string;
}

function normalizeArgs(
  arg1?: string,
  arg2?: string,
  defaultMessage = 'An error occurred',
  defaultCode = 'INTERNAL_SERVER_ERROR'
): { message: string; code: string } {
  if (!arg1 && !arg2) {
    return { message: defaultMessage, code: defaultCode };
  }
  if (arg1 && !arg2) {
    if (!arg1.includes(' ') && arg1 === arg1.toUpperCase()) {
      return { message: defaultMessage, code: arg1 };
    }
    return { message: arg1, code: defaultCode };
  }
  if (arg1 && arg2) {
    if (!arg1.includes(' ') && arg1 === arg1.toUpperCase() && (arg2.includes(' ') || arg2 !== arg2.toUpperCase())) {
      return { message: arg2, code: arg1 };
    }
    return { message: arg1, code: arg2 };
  }
  return { message: defaultMessage, code: defaultCode };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly title: string;
  public readonly errors?: IFieldError[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode | string = 'INTERNAL_SERVER_ERROR',
    title = 'Internal Server Error',
    errors?: IFieldError[],
    isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.title = title;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(arg1?: string, arg2?: string, errors?: IFieldError[]) {
    const { message, code } = normalizeArgs(arg1, arg2, 'The request payload or parameters are invalid', 'MALFORMED_REQUEST');
    super(message, 400, code, 'Bad Request', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'Authentication is required to access this resource', 'AUTH_TOKEN_MISSING');
    super(message, 401, code, 'Unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'You do not have permission to perform this action', 'FORBIDDEN_INSUFFICIENT_ROLE');
    super(message, 403, code, 'Forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'The requested resource was not found', 'NOT_FOUND');
    super(message, 404, code, 'Not Found');
  }
}

export class ConflictError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'The request could not be completed due to a resource conflict', 'CONFLICT_ERROR');
    super(message, 409, code, 'Conflict');
  }
}

export class GoneError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'The requested resource or offer is no longer available', 'WAITLIST_OFFER_EXPIRED');
    super(message, 410, code, 'Gone');
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(arg1?: string, arg2?: string, errors?: IFieldError[]) {
    const { message, code } = normalizeArgs(arg1, arg2, 'The request payload is syntactically correct but semantically unprocessable', 'UNPROCESSABLE_ENTITY');
    super(message, 422, code, 'Unprocessable Entity', errors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'Rate limit exceeded. Please retry later.', 'RATE_LIMIT_EXCEEDED');
    super(message, 429, code, 'Too Many Requests');
  }
}

export class InternalServerError extends AppError {
  constructor(arg1?: string, arg2?: string) {
    const { message, code } = normalizeArgs(arg1, arg2, 'An unexpected internal server error occurred', 'INTERNAL_SERVER_ERROR');
    super(message, 500, code, 'Internal Server Error', undefined, false);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV === 'development';
  let status = 500;
  let code: ErrorCode | string = 'INTERNAL_SERVER_ERROR';
  let title = 'Internal Server Error';
  let detail = 'An unexpected internal server error occurred.';
  let errors: IFieldError[] | undefined;

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_FAILED';
    title = 'Validation Failed';
    detail = 'The request payload or parameters failed schema validation.';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  else if (err instanceof AppError) {
    status = err.statusCode;
    code = err.code;
    title = err.title;
    detail = err.message;
    errors = err.errors;
  }
  else if (err.name === 'CastError') {
    status = 400;
    code = 'MALFORMED_REQUEST';
    title = 'Malformed Request';
    detail = `Invalid identifier format for field '${err.path}': '${err.value}'.`;
  }
  else if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_FAILED';
    title = 'Validation Failed';
    detail = 'Database document validation failed.';
    if (err.errors) {
      errors = Object.values(err.errors).map((e: any) => ({
        field: e.path || 'unknown',
        message: e.message,
      }));
    }
  }
  else if (err.code === 11000) {
    status = 409;
    code = 'CONFLICT_ERROR';
    title = 'Conflict';
    const fields = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
    detail = `A resource with duplicate value for '${fields}' already exists.`;
  }
  else if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    code = 'MALFORMED_REQUEST';
    title = 'Malformed Request';
    detail = 'The request body could not be parsed as valid JSON.';
  }
  else if (err.name === 'JsonWebTokenError') {
    status = 401;
    code = 'AUTH_TOKEN_INVALID';
    title = 'Unauthorized';
    detail = 'The provided authentication token is invalid or corrupted.';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    code = 'AUTH_TOKEN_EXPIRED';
    title = 'Unauthorized';
    detail = 'The authentication token has expired. Please refresh your session.';
  }
  else {
    status = typeof err.statusCode === 'number' ? err.statusCode : 500;
    code = err.code || 'INTERNAL_SERVER_ERROR';
    title = err.title || (status === 404 ? 'Not Found' : 'Internal Server Error');
    detail = isDev ? (err.message || 'An unexpected error occurred.') : (err.message || 'An unexpected internal server error occurred.');
    if (status === 500) {
      console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
    }
  }

  const problemDetails: IProblemDetails = {
    type: `https://unishare.ac.uk/errors/${code.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    detail,
    instance: req.originalUrl,
    code,
    ...(errors && errors.length > 0 ? { errors } : {}),
    timestamp: new Date().toISOString(),
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  };

  res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
  res.status(status).json(problemDetails);
}
