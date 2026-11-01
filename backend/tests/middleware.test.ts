import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from '../src/database/connection';
import { errorHandler, BadRequestError, ConflictError, NotFoundError } from '../src/middleware/error.middleware';
import { validate } from '../src/middleware/validate.middleware';
import { idempotency } from '../src/middleware/idempotency.middleware';
import { IdempotencyKey } from '../src/middleware/idempotency.model';
import rateLimit from 'express-rate-limit';

describe('Tier 1 & 5: Middleware & RFC 7807 Specification Test Suite', () => {
  let testApp: Express;
  let executionCounter = 0;

  beforeAll(async () => {
    await connectDatabase();

    testApp = express();
    testApp.use(express.json());

    const sampleSchema = {
      body: z.object({
        resourceName: z.string().min(3),
        operatingHours: z.number().int().min(1).max(24),
        settings: z.object({
          autoApprove: z.boolean(),
          bufferMinutes: z.number().nonnegative(),
        }),
      }),
    };

    testApp.post(
      '/test/validate',
      validate(sampleSchema),
      (req: Request, res: Response) => {
        res.status(200).json({ success: true, data: req.body });
      }
    );

    testApp.post(
      '/test/idempotent-action',
      idempotency(),
      async (req: Request, res: Response) => {
        executionCounter += 1;
        res.status(201).json({
          success: true,
          actionId: 'act-' + executionCounter,
          receivedData: req.body,
        });
      }
    );

    testApp.get('/test/error/bad-request', () => {
      throw new BadRequestError('Invalid query parameters provided', 'MALFORMED_QUERY');
    });

    testApp.get('/test/error/conflict', () => {
      throw new ConflictError('Resource allocation overlap detected', 'SLOT_COLLISION');
    });

    testApp.get('/test/error/not-found', () => {
      throw new NotFoundError('Equipment profile does not exist', 'RESOURCE_NOT_FOUND');
    });

    const strictLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 3,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          type: 'https://api.unishare.edu/errors/RATE_LIMIT_EXCEEDED',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Too many requests. Please retry later.',
          instance: req.originalUrl,
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
        });
      },
    });

    testApp.get('/test/rate-limited', strictLimiter, (req: Request, res: Response) => {
      res.status(200).json({ message: 'Request accepted' });
    });

    testApp.use((req: Request, res: Response, next: NextFunction) => {
      next(new NotFoundError(`The endpoint ${req.method} ${req.originalUrl} does not exist.`));
    });

    testApp.use(errorHandler);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    executionCounter = 0;
    await IdempotencyKey.deleteMany({});
  });

  describe('RFC 7807 Problem Details Standard Compliance', () => {
    it('MID-01: ensures 404 responses conform strictly to RFC 7807 structure', async () => {
      const res = await request(testApp).get('/api/v1/non-existent-route-999');

      expect(res.status).toBe(404);
      expect(res.body.type).toBeDefined();
      expect(res.body.title).toBe('Not Found');
      expect(res.body.status).toBe(404);
      expect(res.body.detail).toMatch(/does not exist/i);
      expect(res.body.instance).toBe('/api/v1/non-existent-route-999');
      expect(res.body.timestamp).toBeDefined();
    });

    it('MID-01b: ensures semantic domain errors (BadRequest, Conflict, NotFound) emit RFC 7807 problem details', async () => {
      const badReq = await request(testApp).get('/test/error/bad-request');
      expect(badReq.status).toBe(400);
      expect(badReq.body.code).toBe('MALFORMED_QUERY');
      expect(badReq.body.title).toMatch(/Bad Request/i);

      const conflictReq = await request(testApp).get('/test/error/conflict');
      expect(conflictReq.status).toBe(409);
      expect(conflictReq.body.code).toBe('SLOT_COLLISION');

      const notFoundReq = await request(testApp).get('/test/error/not-found');
      expect(notFoundReq.status).toBe(404);
      expect(notFoundReq.body.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Zod Validation Middleware & Deep Field Errors', () => {
    it('MID-02: captures and reports detailed nested field errors with correct target paths', async () => {
      const invalidPayload = {
        resourceName: 'X',
        operatingHours: 25,
        settings: {
          autoApprove: 'not-a-boolean',
          bufferMinutes: -10,
        },
      };

      const res = await request(testApp)
        .post('/test/validate')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.title).toMatch(/Validation Failed/i);
      expect(Array.isArray(res.body.errors)).toBe(true);

      const fieldNames = res.body.errors.map((e: any) => e.field);
      expect(fieldNames).toContain('body.resourceName');
      expect(fieldNames).toContain('body.operatingHours');
      expect(fieldNames).toContain('body.settings.autoApprove');
      expect(fieldNames).toContain('body.settings.bufferMinutes');
    });

    it('MID-02b: successfully passes validation when request payload satisfies all constraints', async () => {
      const validPayload = {
        resourceName: 'Transmission Electron Microscope',
        operatingHours: 12,
        settings: {
          autoApprove: true,
          bufferMinutes: 30,
        },
      };

      const res = await request(testApp)
        .post('/test/validate')
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resourceName).toBe(validPayload.resourceName);
    });
  });

  describe('Idempotency Key Gateway', () => {
    const testKey = '550e8400-e29b-41d4-a716-446655440000';
    const testPayload = { bookingId: 'b-100', equipment: 'Laser Cutter', hours: 2 };

    it('MID-03 & MID-04: executes initial mutation once and returns cached response with X-Cache-Lookup on second identical request', async () => {
      const firstRes = await request(testApp)
        .post('/test/idempotent-action')
        .set('X-Idempotency-Key', testKey)
        .send(testPayload);

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.success).toBe(true);
      expect(firstRes.body.actionId).toBe('act-1');
      expect(executionCounter).toBe(1);

      await new Promise((r) => setTimeout(r, 100));

      const secondRes = await request(testApp)
        .post('/test/idempotent-action')
        .set('X-Idempotency-Key', testKey)
        .send(testPayload);

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.actionId).toBe('act-1');
      expect(secondRes.headers['x-cache-lookup']).toBe('HIT');
      expect(executionCounter).toBe(1);
    });

    it('MID-05: returns 422 Unprocessable Entity when same key is submitted with modified payload', async () => {
      await request(testApp)
        .post('/test/idempotent-action')
        .set('X-Idempotency-Key', testKey)
        .send(testPayload);

      await new Promise((r) => setTimeout(r, 100));

      const tamperedPayload = { ...testPayload, hours: 4 };
      const tamperedRes = await request(testApp)
        .post('/test/idempotent-action')
        .set('X-Idempotency-Key', testKey)
        .send(tamperedPayload);

      expect(tamperedRes.status).toBe(422);
      expect(tamperedRes.body.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
      expect(tamperedRes.body.detail).toMatch(/Payload does not match/i);
    });

    it('MID-06: returns 409 Conflict with Retry-After when duplicate request is in-flight', async () => {
      await IdempotencyKey.create({
        key: 'in-flight-key-123',
        route: 'POST /test/idempotent-action',
        requestHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 'IN_PROGRESS',
        createdAt: new Date(),
      });

      const res = await request(testApp)
        .post('/test/idempotent-action')
        .set('X-Idempotency-Key', 'in-flight-key-123')
        .send(testPayload);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('IDEMPOTENCY_IN_FLIGHT');
      expect(res.headers['retry-after']).toBe('1');
    });
  });

  describe('Rate Limiter Middleware & IETF Draft-7 Headers', () => {
    it('MID-07: emits standard Draft-7 RateLimit headers on successful requests', async () => {
      const res = await request(testApp).get('/test/rate-limited');

      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });

    it('MID-08: returns 429 Too Many Requests when rate limit threshold is exceeded', async () => {
      await request(testApp).get('/test/rate-limited');
      await request(testApp).get('/test/rate-limited');
      await request(testApp).get('/test/rate-limited');

      const rejectedRes = await request(testApp).get('/test/rate-limited');

      expect(rejectedRes.status).toBe(429);
      expect(rejectedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rejectedRes.body.status).toBe(429);
      expect(rejectedRes.body.title).toMatch(/Too Many Requests/i);
    });
  });
});
