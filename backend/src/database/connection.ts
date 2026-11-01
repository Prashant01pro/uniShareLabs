import mongoose from 'mongoose';
import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';

export interface DatabaseConnectionOptions {
  uri?: string;
  useReplicaSet?: boolean;
  maxPoolSize?: number;
  minPoolSize?: number;
  serverSelectionTimeoutMS?: number;
  autoIndex?: boolean;
}

let mongoMemoryServer: MongoMemoryServer | null = null;
let mongoMemoryReplSet: MongoMemoryReplSet | null = null;
let activeUri: string | null = null;
let isShuttingDown = false;
let listenersRegistered = false;

export function sanitizeMongoUri(uri: string): string {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@.*)/, '$1*****$2');
}

function registerLifecycleListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (err) => {
    console.error('[Database Error]', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] Mongoose disconnected');
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Database] Received ${signal}. Gracefully disconnecting database...`);
    await disconnectDatabase();
  };

  process.once('SIGINT', () => handleShutdown('SIGINT'));
  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
}

export async function connectDatabase(options?: DatabaseConnectionOptions): Promise<string> {
  if (mongoose.connection.readyState === 1 && activeUri) {
    return activeUri;
  }

  const envUri = options?.uri || process.env.MONGODB_URI;
  const isExternalUri = envUri && envUri.trim() !== '' && envUri.trim().toLowerCase() !== 'inmemory';

  const connectionOptions: mongoose.ConnectOptions = {
    maxPoolSize: options?.maxPoolSize || Number(process.env.MONGODB_MAX_POOL_SIZE) || 50,
    minPoolSize: options?.minPoolSize || Number(process.env.MONGODB_MIN_POOL_SIZE) || 5,
    serverSelectionTimeoutMS: options?.serverSelectionTimeoutMS || 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    family: 4,
    autoIndex: options?.autoIndex ?? (process.env.NODE_ENV !== 'production'),
  };

  if (isExternalUri) {
    try {
      console.log(`[Database] Connecting to external MongoDB at ${sanitizeMongoUri(envUri)}...`);
      await mongoose.connect(envUri, connectionOptions);
      activeUri = envUri;
      console.log('[Database] Connected successfully to external MongoDB');
      registerLifecycleListeners();
      return activeUri;
    } catch (externalErr: any) {
      console.warn(`[Database] Could not connect to external MongoDB (${externalErr?.message || externalErr}).`);
      console.log('[Database] Automatically falling back to in-memory MongoDB (MongoMemoryServer)...');
    }
  }

  const preferReplicaSet = options?.useReplicaSet ?? (process.env.USE_REPLICA_SET === 'true');

  if (preferReplicaSet) {
    try {
      console.log('[Database] Initializing MongoMemoryReplSet for transaction support...');
      mongoMemoryReplSet = await MongoMemoryReplSet.create({
        replSet: { count: 1 },
      });
      activeUri = mongoMemoryReplSet.getUri();
      console.log(`[Database] In-memory MongoMemoryReplSet started at ${activeUri}`);
      await mongoose.connect(activeUri, connectionOptions);
      registerLifecycleListeners();
      return activeUri;
    } catch (replSetErr) {
      console.warn('[Database] MongoMemoryReplSet failed (socket/EACCES issue). Falling back to MongoMemoryServer...', replSetErr);
      if (mongoMemoryReplSet) {
        try { await mongoMemoryReplSet.stop(); } catch (_) {}
        mongoMemoryReplSet = null;
      }
    }
  }

  console.log('[Database] Initializing standalone MongoMemoryServer...');
  mongoMemoryServer = await MongoMemoryServer.create();
  activeUri = mongoMemoryServer.getUri();
  await mongoose.connect(activeUri, connectionOptions);
  console.log(`[Database] Connected to in-memory MongoDB at ${activeUri}`);

  registerLifecycleListeners();
  return activeUri;
}

export async function disconnectDatabase(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoMemoryReplSet) {
      await mongoMemoryReplSet.stop();
      mongoMemoryReplSet = null;
    }
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    activeUri = null;
    console.log('[Database] Disconnected and in-memory servers terminated.');
  } finally {
    isShuttingDown = false;
  }
}

export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  const clearPromises = Object.keys(collections).map((key) => collections[key].deleteMany({}));
  await Promise.all(clearPromises);
}

export function getDatabaseUri(): string | null {
  return activeUri;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
