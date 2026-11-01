import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options, RateLimitRequestHandler } from 'express-rate-limit';
import { IProblemDetails } from './error.middleware';

export interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  message?: string;
  code?: string;
  skipTest?: boolean;
}

function createRateLimitHandler(message: string, code = 'RATE_LIMIT_EXCEEDED') {
  return (req: Request, res: Response, next: NextFunction, options: Options): void => {
    const status = 429;
    const problemDetails: IProblemDetails = {
      type: `https://api.unishare.edu/errors/${code}`,
      title: 'Too Many Requests',
      status,
      detail: message || (typeof options.message === 'string' ? options.message : 'Too many requests. Please retry later.'),
      instance: req.originalUrl,
      code,
      timestamp: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
    res.status(status).json(problemDetails);
  };
}

export function createRateLimiter(options: RateLimiterOptions): RateLimitRequestHandler {
  const {
    windowMs,
    limit,
    message = 'Too many requests from this IP address. Please retry later.',
    code = 'RATE_LIMIT_EXCEEDED',
    skipTest = true,
  } = options;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req: Request) => {
      if (skipTest && process.env.NODE_ENV === 'test') return true;
      if (req.path === '/api/health') return true;
      return false;
    },
    handler: createRateLimitHandler(message, code),
  });
}

export const generalLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX_GENERAL) || 300,
  message: 'Too many requests to the UniShare Labs API. Please retry after 15 minutes.',
  code: 'RATE_LIMIT_EXCEEDED',
});

export const generalRateLimiter = generalLimiter;

export const authLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX_AUTH) || 10,
  message: 'Too many authentication attempts. Please retry after 15 minutes.',
  code: 'RATE_LIMIT_EXCEEDED',
});

export const mutationLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX_MUTATION) || 60,
  message: 'Too many resource mutation requests. Please retry after 15 minutes.',
  code: 'RATE_LIMIT_EXCEEDED',
});
