import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middleware/rate-limiter.middleware';
import { errorHandler, NotFoundError } from './middleware/error.middleware';
import { authRouter } from './features/auth/auth.routes';
import { labRouter } from './features/labs/lab.routes';
import { resourceRouter } from './features/resources/resource.routes';
import { bookingRouter } from './features/bookings/booking.routes';
import { fairnessRouter } from './features/fairness/fairness.routes';
import { waitlistRouter } from './features/waitlist/waitlist.routes';
import { inspectionRouter } from './features/inspections/inspection.routes';
import { incidentRouter } from './features/incidents/incident.routes';
import { auditRouter } from './features/audit/audit.routes';

export const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(generalLimiter);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'unishare-backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/labs', labRouter);
app.use('/api/v1/resources', resourceRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/fairness', fairnessRouter);
app.use('/api/v1/waitlist', waitlistRouter);
app.use('/api/v1/inspections', inspectionRouter);
app.use('/api/v1/incidents', incidentRouter);
app.use('/api/v1/audit', auditRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`The endpoint ${req.method} ${req.originalUrl} does not exist.`));
});

app.use(errorHandler);
