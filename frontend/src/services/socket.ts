import { io, Socket } from 'socket.io-client';
import '../types';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const SOCKET_URL: string =
  metaEnv?.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'http://localhost:5000');

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;

  public connect(token?: string): Socket {
    const activeToken = token || localStorage.getItem('token');

    if (this.socket && this.socket.connected && this.currentToken === activeToken) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentToken = activeToken;

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: activeToken ? `Bearer ${activeToken}` : undefined,
        accessToken: activeToken || undefined,
      },
    });

    this.socket.on('connect', () => {
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[SocketService] Handshake/Connection error:', error.message);
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentToken = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return !!(this.socket && this.socket.connected);
  }

  public joinRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('join:room', { room });
    }
  }

  public leaveRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('leave:room', { room });
    }
  }

  public joinUserRoom(userId: string): void {
    if (this.socket) {
      this.socket.emit('join:user', { userId });
    }
  }

  public joinRoleRoom(role: string): void {
    if (this.socket && (role === 'LAB_MANAGER' || role === 'ADMIN' || role === 'RESOURCE_OWNER')) {
      this.socket.emit('join:manager');
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  public emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
