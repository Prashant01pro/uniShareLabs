import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcryptjs from 'bcryptjs';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase, clearDatabase } from '../src/database/connection';
import { User } from '../src/features/auth/user.model';
import { RefreshToken } from '../src/features/auth/refresh-token.model';

describe('Tier 1 & 5: Authentication & RBAC Test Suite', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  const validStudent = {
    name: 'Ada Lovelace',
    email: 'ada.lovelace@cambridge.edu',
    password: 'SecurePassword123!',
    role: 'STUDENT',
    department: 'Computer Science',
    certifications: [
      {
        certCode: 'CERT-CS-SAFETY-01',
        name: 'Basic Lab Safety',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };

  const validManager = {
    name: 'Prof. Alan Turing',
    email: 'alan.turing@cambridge.edu',
    password: 'ManagerPassword123!',
    role: 'LAB_MANAGER',
    department: 'Computer Science',
  };

  describe('POST /api/v1/auth/register', () => {
    it('AUTH-01: successfully registers a new student user and returns dual tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validStudent);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validStudent.email);
      expect(res.body.user.role).toBe('STUDENT');
      expect(res.body.user.trustScore).toBe(85);
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.refreshToken).toBeDefined();
      expect(typeof res.body.refreshToken).toBe('string');

      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('AUTH-02: returns 409 Conflict when attempting to register an existing email', async () => {
      await request(app).post('/api/v1/auth/register').send(validStudent);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validStudent);

      expect(res.status).toBe(409);
      expect(res.body.status).toBe(409);
      expect(res.body.code).toMatch(/CONFLICT_ERROR|EMAIL_ALREADY_EXISTS/);
      expect(res.body.title).toBeDefined();
      expect(res.body.detail).toMatch(/already registered|duplicate/i);
    });

    it('AUTH-03: returns 400 Bad Request with field errors when payload fails Zod schema', async () => {
      const invalidPayload = {
        name: 'A',
        email: 'invalid-email-address',
        password: '123',
        role: 'SUPER_HERO',
        department: '',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(Array.isArray(res.body.errors)).toBe(true);

      const fieldsWithErrors = res.body.errors.map((e: any) => e.field);
      expect(fieldsWithErrors).toContain('body.email');
      expect(fieldsWithErrors).toContain('body.password');
    });
  });

  describe('Password Hashing Verification (bcrypt)', () => {
    it('AUTH-04: verifies password is stored as genuine bcrypt hash and not plain text', async () => {
      await request(app).post('/api/v1/auth/register').send(validStudent);

      const storedUser = await User.findOne({ email: validStudent.email }).select('+passwordHash');
      expect(storedUser).toBeDefined();
      expect(storedUser!.passwordHash).toBeDefined();

      expect(storedUser!.passwordHash).not.toBe(validStudent.password);

      expect(storedUser!.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);

      const matchSuccess = await bcryptjs.compare(validStudent.password, storedUser!.passwordHash);
      expect(matchSuccess).toBe(true);

      const matchFail = await bcryptjs.compare('WrongPassword456!', storedUser!.passwordHash);
      expect(matchFail).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validStudent);
    });

    it('AUTH-05: returns 200 OK with valid credentials and dual tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validStudent.email,
          password: validStudent.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validStudent.email);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('AUTH-06: returns 401 Unauthorized when password is incorrect', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validStudent.email,
          password: 'IncorrectPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.detail).toMatch(/Invalid email or password/i);
    });

    it('AUTH-07: returns 401 Unauthorized when email is not registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user@cambridge.edu',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh & Token Rotation', () => {
    it('AUTH-08: successfully rotates refresh token and returns fresh token pair', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validStudent);
      const initialRefreshToken = regRes.body.refreshToken;
      expect(initialRefreshToken).toBeDefined();

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
      expect(refreshRes.body.refreshToken).not.toBe(initialRefreshToken);

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(validStudent.email);
    });

    it('AUTH-09: detects refresh token reuse and revokes token family (RFC 6819)', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validStudent);
      const initialRefreshToken = regRes.body.refreshToken;

      const firstRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });
      expect(firstRefresh.status).toBe(200);

      const replayedRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(replayedRefresh.status).toBe(401);
      expect(replayedRefresh.body.code).toBe('AUTH_TOKEN_REUSED');
    });
  });

  describe('GET /api/v1/auth/me & Profile Security', () => {
    it('AUTH-10: returns enriched user profile when bearer token is valid', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send(validStudent);
      const token = loginRes.body.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validStudent.email);
      expect(res.body.user.trustScore).toBeDefined();
      expect(res.body.quotas).toBeDefined();
      expect(res.body.quotas.weeklyLimitHours).toBeDefined();
    });

    it('AUTH-11: returns 401 AUTH_TOKEN_MISSING when authorization header is absent', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING');
      expect(res.body.title).toMatch(/Unauthorized/i);
    });

    it('AUTH-12: returns 401 AUTH_TOKEN_INVALID when bearer token is malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer fake.invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('AUTH-13: forbids STUDENT from accessing LAB_MANAGER protected routes (403 Forbidden)', async () => {
      const studentRes = await request(app).post('/api/v1/auth/register').send(validStudent);
      const studentToken = studentRes.body.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/test-manager-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    it('AUTH-14: permits LAB_MANAGER to access LAB_MANAGER protected routes (200 OK)', async () => {
      const managerRes = await request(app).post('/api/v1/auth/register').send(validManager);
      const managerToken = managerRes.body.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/test-manager-only')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Manager access granted/i);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('AUTH-15: successfully revokes refresh token upon logout', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validStudent);
      const { accessToken, refreshToken } = regRes.body;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshAttempt.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/demo-tokens', () => {
    it('AUTH-16: returns pre-seeded tokens for all 5 demo personas', async () => {
      const res = await request(app).get('/api/v1/auth/demo-tokens');

      expect(res.status).toBe(200);
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.STUDENT).toBeDefined();
      expect(res.body.tokens.RESEARCHER).toBeDefined();
      expect(res.body.tokens.RESOURCE_OWNER).toBeDefined();
      expect(res.body.tokens.LAB_MANAGER).toBeDefined();
      expect(res.body.tokens.ADMIN).toBeDefined();

      expect(res.body.personas).toBeDefined();
      expect(res.body.personas.STUDENT).toBeDefined();
      expect(res.body.personas.RESEARCHER).toBeDefined();
    });
  });
});
