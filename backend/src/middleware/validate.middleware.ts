import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { BadRequestError, IFieldError } from './error.middleware';

export interface RequestValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function extractZodErrors(error: ZodError, prefix: string): IFieldError[] {
  return error.errors.map((issue) => {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '';
    const fullField = fieldPath ? `${prefix}.${fieldPath}` : prefix;
    return {
      field: fullField,
      message: issue.message,
    };
  });
}

export function validate(schemas: RequestValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const collectedErrors: IFieldError[] = [];

    if (schemas.params) {
      const paramsResult = await schemas.params.safeParseAsync(req.params);
      if (!paramsResult.success) {
        collectedErrors.push(...extractZodErrors(paramsResult.error, 'params'));
      } else {
        Object.defineProperty(req, 'params', {
          value: paramsResult.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }

    if (schemas.query) {
      const queryResult = await schemas.query.safeParseAsync(req.query);
      if (!queryResult.success) {
        collectedErrors.push(...extractZodErrors(queryResult.error, 'query'));
      } else {
        Object.defineProperty(req, 'query', {
          value: queryResult.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }

    if (schemas.body) {
      const bodyResult = await schemas.body.safeParseAsync(req.body);
      if (!bodyResult.success) {
        collectedErrors.push(...extractZodErrors(bodyResult.error, 'body'));
      } else {
        req.body = bodyResult.data;
      }
    }

    if (collectedErrors.length > 0) {
      return next(
        new BadRequestError(
          'The request parameters or payload failed schema validation.',
          'VALIDATION_FAILED',
          collectedErrors
        )
      );
    }

    next();
  };
}

export function validateBody(schema: ZodTypeAny) {
  return validate({ body: schema });
}

export function validateQuery(schema: ZodTypeAny) {
  return validate({ query: schema });
}

export function validateParams(schema: ZodTypeAny) {
  return validate({ params: schema });
}
