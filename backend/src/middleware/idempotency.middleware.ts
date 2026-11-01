import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyKey, IIdempotencyKey } from './idempotency.model';
import { BadRequestError, ConflictError, UnprocessableEntityError } from './error.middleware';

export interface IdempotencyOptions {
  required?: boolean;
}

export function canonicalizeJson(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeJson);
  }
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = canonicalizeJson(obj[key]);
      return acc;
    }, {});
}

export function computeRequestHash(body: any): string {
  const canonical = canonicalizeJson(body ?? {});
  const serialized = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export function idempotencyMiddleware(options?: IdempotencyOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey = req.headers['x-idempotency-key'];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!key || key.trim() === '') {
      if (options?.required) {
        return next(new BadRequestError('Missing required X-Idempotency-Key header.', 'MALFORMED_REQUEST'));
      }
      return next(); 
    }

    const trimmedKey = key.trim();
    if (trimmedKey.length < 1 || trimmedKey.length > 128) {
      return next(new BadRequestError('Invalid X-Idempotency-Key length (must be 1-128 characters).', 'MALFORMED_REQUEST'));
    }

    const currentHash = computeRequestHash(req.body);
    const route = `${req.method} ${req.baseUrl || ''}${req.path}`;
    const userId = (req as any).user?._id || (req as any).user?.id || undefined;

    try {
      const existing = await IdempotencyKey.findOne({ key: trimmedKey });

      if (existing) {
        if (existing.status === 'IN_PROGRESS') {
          res.setHeader('Retry-After', '1');
          return next(
            new ConflictError(
              'A mutation with this idempotency key is currently in progress. Please retry shortly.',
              'IDEMPOTENCY_IN_FLIGHT'
            )
          );
        }

        if (existing.status === 'COMPLETED') {
          if (existing.requestHash !== currentHash) {
            return next(
              new UnprocessableEntityError(
                'The request payload does not match the original request for this idempotency key.',
                'IDEMPOTENCY_PAYLOAD_MISMATCH'
              )
            );
          }

          res.setHeader('X-Cache-Lookup', 'HIT');
          res.setHeader('X-Idempotent-Replay', 'true');
          res.status(existing.statusCode || 200).json(existing.responseBody);
          return;
        }

        if (existing.status === 'FAILED') {
          await IdempotencyKey.deleteOne({ _id: existing._id });
        }
      }

      let record: IIdempotencyKey;
      try {
        record = await IdempotencyKey.create({
          key: trimmedKey,
          userId,
          route,
          requestHash: currentHash,
          status: 'IN_PROGRESS',
        });
      } catch (insertErr: any) {
        if (insertErr.code === 11000) {
          res.setHeader('Retry-After', '1');
          return next(
            new ConflictError(
              'A mutation with this idempotency key is currently in progress.',
              'IDEMPOTENCY_IN_FLIGHT'
            )
          );
        }
        throw insertErr;
      }

      const originalJson = res.json.bind(res);
      let finalized = false;

      res.json = function (body: any): Response {
        if (!finalized) {
          finalized = true;
          const statusCode = res.statusCode;
          const isSuccessful = statusCode >= 200 && statusCode < 500;

          IdempotencyKey.updateOne(
            { _id: record._id },
            {
              $set: {
                status: isSuccessful ? 'COMPLETED' : 'FAILED',
                statusCode,
                responseBody: isSuccessful ? body : undefined,
              },
            }
          ).catch((err) => {
            console.error('[Idempotency] Failed to update record status:', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

export const idempotency = idempotencyMiddleware;
