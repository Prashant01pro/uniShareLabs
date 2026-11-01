import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { app } from './app';
import { connectDatabase } from './database/connection';
import { initSocketServer } from './real-time/socket';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

export const io = initSocketServer(httpServer);

async function bootstrap() {
  try {
    await connectDatabase();

    try {
      const { Resource } = await import('./features/resources/resource.model');
      const count = await Resource.countDocuments();
      if (count === 0 || process.env.SEED_ON_BOOT === 'true') {
        console.log('[Server] Database is empty or SEED_ON_BOOT=true. Seeding demo personas & instruments...');
        const { seedDatabase } = await import('./database/seed');
        await seedDatabase({ silent: false });
        console.log('[Server] Deterministic seeding completed successfully.');
      }
    } catch (seedErr) {
      console.warn('[Server] Auto-seed check warning (non-fatal):', seedErr);
    }

    httpServer.listen(PORT, () => {
      console.log(`[Server] UniShare Labs backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize backend server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { httpServer };
