import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/database/connection';

describe('Tier 1: Core Health & Database Fallback', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /api/health returns 200 with healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('unishare-backend');
    expect(res.body.timestamp).toBeDefined();
  });
});
