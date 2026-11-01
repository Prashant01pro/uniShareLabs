import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket, ServerOptions } from 'socket.io';
import { UserRole } from '../features/auth/user.model';
import { jwtService } from '../features/auth/jwt.service';

export interface AuthenticatedUserPayload {
  id: string;
  sub?: string;
  email: string;
  role: UserRole;
  department: string;
  name?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: AuthenticatedUserPayload;
  };
}

export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  resource: (resourceId: string) => `resource:${resourceId}`,
  booking: (bookingId: string) => `booking:${bookingId}`,
  labManager: () => 'role:LAB_MANAGER',
  admin: () => 'role:ADMIN',
} as const;

export const SOCKET_EVENTS = {
  JOIN_USER: 'join:user',
  JOIN_RESOURCE: 'join:resource',
  LEAVE_RESOURCE: 'leave:resource',
  JOIN_BOOKING: 'join:booking',
  LEAVE_BOOKING: 'leave:booking',
  JOIN_MANAGER: 'join:manager',
  LEAVE_MANAGER: 'leave:manager',

  BOOKING_CREATED: 'booking:created',
  BOOKING_APPROVED: 'booking:approved',
  BOOKING_REJECTED: 'booking:rejected',
  WAITLIST_PROMOTED: 'waitlist:promoted',
  BOOKING_CHECKED_IN: 'booking:checked_in',
  BOOKING_LATE_WARNING: 'booking:late_warning',
  BOOKING_RETURNED: 'booking:returned',
  INCIDENT_CREATED: 'incident:created',
  TRUST_SCORE_UPDATED: 'trust_score:updated',
  RESOURCE_STATUS_CHANGED: 'resource:status_changed',
  SYSTEM_NOTIFICATION: 'system:notification',
} as const;

let ioInstance: SocketIOServer | null = null;

export function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  try {
    let token: string | undefined = socket.handshake.auth?.token || socket.handshake.auth?.accessToken;

    if (!token && socket.handshake.headers?.authorization) {
      token = socket.handshake.headers.authorization;
    }

    if (!token && socket.handshake.headers?.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').reduce<Record<string, string>>((acc, cookie) => {
        const [k, v] = cookie.trim().split('=');
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
      }, {});
      token = cookies['accessToken'] || cookies['jwt'];
    }

    if (!token || token.trim() === '') {
      return next(new Error('AUTH_TOKEN_MISSING'));
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    try {
      const decoded = jwtService.verifyAccessToken(token);
      socket.data.user = {
        id: decoded.sub,
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        department: decoded.department,
        name: decoded.name,
      };
      next();
    } catch (err: any) {
      if (err.code === 'AUTH_TOKEN_EXPIRED') {
        return next(new Error('AUTH_TOKEN_EXPIRED'));
      }
      return next(new Error('AUTH_TOKEN_INVALID'));
    }
  } catch (err: any) {
    return next(new Error('AUTH_TOKEN_INVALID'));
  }
}

export function initSocketServer(
  httpServer: HttpServer,
  customOptions?: Partial<ServerOptions>
): SocketIOServer {
  const allowedOrigin =
    process.env.SOCKET_CORS_ORIGIN ||
    process.env.CORS_ORIGIN ||
    'http://localhost:5173';

  const defaultOptions: Partial<ServerOptions> = {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  };

  const io = new SocketIOServer(httpServer, { ...defaultOptions, ...customOptions });
  ioInstance = io;

  io.use(socketAuthMiddleware as any);

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    if (user?.id) {
      socket.join(SOCKET_ROOMS.user(user.id));
    }
    if (user?.role === 'LAB_MANAGER' || user?.role === 'ADMIN') {
      socket.join(SOCKET_ROOMS.labManager());
    }
    if (user?.role === 'ADMIN') {
      socket.join(SOCKET_ROOMS.admin());
    }

    socket.on(SOCKET_EVENTS.JOIN_USER, (data: { userId?: string } | undefined, ack?: (res: any) => void) => {
      const targetUserId = data?.userId || user?.id;
      if (!targetUserId) {
        if (typeof ack === 'function') ack({ success: false, error: 'Target userId required' });
        return;
      }

      if (user?.role !== 'ADMIN' && user?.id !== targetUserId) {
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Forbidden: Insufficient permissions to join room for user ' + targetUserId });
        }
        return;
      }

      const roomName = SOCKET_ROOMS.user(targetUserId);
      socket.join(roomName);
      if (typeof ack === 'function') ack({ success: true, room: roomName });
    });

    socket.on(SOCKET_EVENTS.JOIN_RESOURCE, (data: { resourceId: string }, ack?: (res: any) => void) => {
      if (!data?.resourceId || typeof data.resourceId !== 'string') {
        if (typeof ack === 'function') ack({ success: false, error: 'resourceId is required' });
        return;
      }
      const roomName = SOCKET_ROOMS.resource(data.resourceId);
      socket.join(roomName);
      if (typeof ack === 'function') ack({ success: true, room: roomName });
    });

    socket.on(SOCKET_EVENTS.LEAVE_RESOURCE, (data: { resourceId: string }, ack?: (res: any) => void) => {
      if (data?.resourceId) {
        socket.leave(SOCKET_ROOMS.resource(data.resourceId));
      }
      if (typeof ack === 'function') ack({ success: true });
    });

    socket.on(SOCKET_EVENTS.JOIN_BOOKING, (data: { bookingId: string }, ack?: (res: any) => void) => {
      if (!data?.bookingId || typeof data.bookingId !== 'string') {
        if (typeof ack === 'function') ack({ success: false, error: 'bookingId is required' });
        return;
      }
      const roomName = SOCKET_ROOMS.booking(data.bookingId);
      socket.join(roomName);
      if (typeof ack === 'function') ack({ success: true, room: roomName });
    });

    socket.on(SOCKET_EVENTS.LEAVE_BOOKING, (data: { bookingId: string }, ack?: (res: any) => void) => {
      if (data?.bookingId) {
        socket.leave(SOCKET_ROOMS.booking(data.bookingId));
      }
      if (typeof ack === 'function') ack({ success: true });
    });

    socket.on(SOCKET_EVENTS.JOIN_MANAGER, (_data: any, ack?: (res: any) => void) => {
      if (user?.role !== 'LAB_MANAGER' && user?.role !== 'ADMIN') {
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Forbidden: Insufficient role for manager room' });
        }
        return;
      }
      const roomName = SOCKET_ROOMS.labManager();
      socket.join(roomName);
      if (typeof ack === 'function') ack({ success: true, room: roomName });
    });

    socket.on(SOCKET_EVENTS.LEAVE_MANAGER, (_data: any, ack?: (res: any) => void) => {
      socket.leave(SOCKET_ROOMS.labManager());
      if (typeof ack === 'function') ack({ success: true });
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('[Socket.IO] Server instance has not been initialized. Call initSocketServer() first.');
  }
  return ioInstance;
}

export function emitEvent<T = any>(room: string, event: string, payload: T): boolean {
  if (!ioInstance) {
    console.warn(`[Socket.IO] Cannot dispatch event '${event}' to room '${room}': Server not initialized.`);
    return false;
  }
  ioInstance.to(room).emit(event, payload);
  return true;
}

export function emitToUser<T = any>(userId: string, event: string, payload: T): boolean {
  return emitEvent(SOCKET_ROOMS.user(userId), event, payload);
}

export function emitToResource<T = any>(resourceId: string, event: string, payload: T): boolean {
  return emitEvent(SOCKET_ROOMS.resource(resourceId), event, payload);
}

export function emitToBooking<T = any>(bookingId: string, event: string, payload: T): boolean {
  return emitEvent(SOCKET_ROOMS.booking(bookingId), event, payload);
}

export function emitToManagers<T = any>(event: string, payload: T): boolean {
  return emitEvent(SOCKET_ROOMS.labManager(), event, payload);
}

export function broadcastEvent<T = any>(event: string, payload: T): boolean {
  if (!ioInstance) return false;
  ioInstance.emit(event, payload);
  return true;
}

export async function closeSocketServer(): Promise<void> {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance!.close(() => {
        ioInstance = null;
        resolve();
      });
    });
  }
}

export { ioInstance as io };
