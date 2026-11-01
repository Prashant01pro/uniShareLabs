import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/database/connection';
import {
  initSocketServer,
  closeSocketServer,
  emitToResource,
  emitToUser,
  SOCKET_EVENTS,
} from '../src/real-time/socket';
import { generateAccessToken } from '../src/features/auth/jwt.service';

describe('Tier 1 & 3: Socket.IO Real-Time Infrastructure Suite', () => {
  let httpServer: HttpServer;
  let serverPort: number;
  let activeClients: ClientSocket[] = [];

  const accessSecret =
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'unishare-default-access-secret-32-chars-minimum!';

  const studentUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'student.alice@cambridge.edu',
    role: 'STUDENT' as const,
    department: 'Physics',
    name: 'Alice Student',
  };

  const managerUser = {
    _id: '507f1f77bcf86cd799439022',
    email: 'manager.bob@cambridge.edu',
    role: 'LAB_MANAGER' as const,
    department: 'Physics',
    name: 'Bob Manager',
  };

  const researcherUser = {
    _id: '507f1f77bcf86cd799439033',
    email: 'researcher.charlie@cambridge.edu',
    role: 'RESEARCHER' as const,
    department: 'Chemistry',
    name: 'Charlie Researcher',
  };

  function createTestToken(user: any): string {
    return generateAccessToken(user);
  }

  function createExpiredToken(user: any): string {
    return jwt.sign(
      {
        sub: user._id,
        email: user.email,
        role: user.role,
        department: user.department,
        name: user.name,
      },
      accessSecret,
      { expiresIn: '-1s' }
    );
  }

  function createConnectedSocket(token?: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://127.0.0.1:${serverPort}`, {
        auth: token ? { token: `Bearer ${token}` } : {},
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      activeClients.push(client);

      client.on('connect', () => resolve(client));
      client.on('connect_error', (err) => reject(err));
    });
  }

  beforeAll(async () => {
    await connectDatabase();

    httpServer = createServer(app);
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const client of activeClients) {
      if (client.connected) client.disconnect();
    }
    await closeSocketServer();
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    await disconnectDatabase();
  });

  afterEach(() => {
    for (const client of activeClients) {
      if (client.connected) client.disconnect();
    }
    activeClients = [];
  });

  describe('JWT Handshake Authentication', () => {
    it('SOCK-01: rejects socket connection when auth token is missing', async () => {
      await expect(createConnectedSocket(undefined)).rejects.toThrow(
        /AUTH_TOKEN_MISSING|Authentication error/
      );
    });

    it('SOCK-02: rejects socket connection when JWT signature is invalid', async () => {
      await expect(createConnectedSocket('invalid.malformed.token')).rejects.toThrow(
        /AUTH_TOKEN_INVALID/
      );
    });

    it('SOCK-02b: rejects socket connection when JWT is expired', async () => {
      const expiredToken = createExpiredToken(studentUser);
      await expect(createConnectedSocket(expiredToken)).rejects.toThrow(
        /AUTH_TOKEN_EXPIRED|AUTH_TOKEN_INVALID/
      );
    });

    it('SOCK-03: successfully connects with a valid signed JWT access token', async () => {
      const validToken = createTestToken(studentUser);
      const socket = await createConnectedSocket(validToken);

      expect(socket.connected).toBe(true);
      expect(socket.id).toBeDefined();
    });
  });

  describe('Room Registration & RBAC Handlers', () => {
    it('SOCK-06: successfully joins and leaves a resource channel', async () => {
      const token = createTestToken(studentUser);
      const socket = await createConnectedSocket(token);

      const joinAck = await new Promise<any>((resolve) => {
        socket.emit(SOCKET_EVENTS.JOIN_RESOURCE, { resourceId: 'res-microscope-01' }, resolve);
      });

      expect(joinAck.success).toBe(true);
      expect(joinAck.room).toBe('resource:res-microscope-01');

      const leaveAck = await new Promise<any>((resolve) => {
        socket.emit(SOCKET_EVENTS.LEAVE_RESOURCE, { resourceId: 'res-microscope-01' }, resolve);
      });

      expect(leaveAck.success).toBe(true);
    });

    it('SOCK-07: successfully joins and leaves a booking channel', async () => {
      const token = createTestToken(studentUser);
      const socket = await createConnectedSocket(token);

      const joinAck = await new Promise<any>((resolve) => {
        socket.emit(SOCKET_EVENTS.JOIN_BOOKING, { bookingId: 'booking-999' }, resolve);
      });

      expect(joinAck.success).toBe(true);
      expect(joinAck.room).toBe('booking:booking-999');

      const leaveAck = await new Promise<any>((resolve) => {
        socket.emit(SOCKET_EVENTS.LEAVE_BOOKING, { bookingId: 'booking-999' }, resolve);
      });

      expect(leaveAck.success).toBe(true);
    });

    it('SOCK-08: forbids regular STUDENT from joining LAB_MANAGER channel', async () => {
      const studentToken = createTestToken(studentUser);
      const socket = await createConnectedSocket(studentToken);

      const ack = await new Promise<any>((resolve) => {
        socket.emit(SOCKET_EVENTS.JOIN_MANAGER, {}, resolve);
      });

      expect(ack.success).toBe(false);
      expect(ack.error).toMatch(/Forbidden|Insufficient role/i);
    });

    it('SOCK-09: permits LAB_MANAGER to join LAB_MANAGER channel', async () => {
      const managerToken = createTestToken(managerUser);
      const socket = await createConnectedSocket(managerToken);

      const ack = await new Promise<any>((resolve) => {
        socket.emit(SOCKET_EVENTS.JOIN_MANAGER, {}, resolve);
      });

      expect(ack.success).toBe(true);
      expect(ack.room).toBe('role:LAB_MANAGER');
    });
  });

  describe('Real-Time Event Broadcast & Targeted Dispatch Verification', () => {
    it('SOCK-10: broadcasts booking:created event strictly to clients enrolled in target resource channel', async () => {
      const tokenA = createTestToken(studentUser);
      const tokenB = createTestToken(researcherUser);

      const clientA = await createConnectedSocket(tokenA);
      const clientB = await createConnectedSocket(tokenB);

      await new Promise<any>((resolve) => {
        clientA.emit(SOCKET_EVENTS.JOIN_RESOURCE, { resourceId: 'res-spectrometer-01' }, resolve);
      });

      let clientAReceivedData: any = null;
      let clientBReceivedData: any = null;

      clientA.on(SOCKET_EVENTS.BOOKING_CREATED, (data) => {
        clientAReceivedData = data;
      });

      clientB.on(SOCKET_EVENTS.BOOKING_CREATED, (data) => {
        clientBReceivedData = data;
      });

      const dispatchedPayload = {
        bookingId: 'book-auto-101',
        resourceId: 'res-spectrometer-01',
        resourceName: 'Bruker D8 XRD',
        startTime: new Date().toISOString(),
      };

      const emitSuccess = emitToResource('res-spectrometer-01', SOCKET_EVENTS.BOOKING_CREATED, dispatchedPayload);
      expect(emitSuccess).toBe(true);

      await new Promise((r) => setTimeout(r, 200));

      expect(clientAReceivedData).toBeDefined();
      expect(clientAReceivedData.bookingId).toBe(dispatchedPayload.bookingId);
      expect(clientAReceivedData.resourceName).toBe(dispatchedPayload.resourceName);

      expect(clientBReceivedData).toBeNull();
    });

    it('SOCK-11: delivers private notification directly to targeted user channel via emitToUser', async () => {
      const tokenAlice = createTestToken(studentUser);
      const tokenCharlie = createTestToken(researcherUser);

      const clientAlice = await createConnectedSocket(tokenAlice);
      const clientCharlie = await createConnectedSocket(tokenCharlie);

      let aliceNotification: any = null;
      let charlieNotification: any = null;

      clientAlice.on(SOCKET_EVENTS.TRUST_SCORE_UPDATED, (data) => {
        aliceNotification = data;
      });

      clientCharlie.on(SOCKET_EVENTS.TRUST_SCORE_UPDATED, (data) => {
        charlieNotification = data;
      });

      const scorePayload = {
        userId: studentUser._id,
        previousScore: 85,
        newScore: 92,
        reason: 'Pristine equipment handover completed',
      };

      emitToUser(studentUser._id, SOCKET_EVENTS.TRUST_SCORE_UPDATED, scorePayload);

      await new Promise((r) => setTimeout(r, 200));

      expect(aliceNotification).toBeDefined();
      expect(aliceNotification.newScore).toBe(92);
      expect(charlieNotification).toBeNull();
    });
  });
});
