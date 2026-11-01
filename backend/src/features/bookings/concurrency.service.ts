import mongoose, { ClientSession } from 'mongoose';
import { Booking, IBookingDocument, BookingStatus } from './booking.model';
import { ConflictError, NotFoundError, BadRequestError } from '../../middleware/error.middleware';

export const OCCUPYING_STATUSES: BookingStatus[] = [
  'APPROVED',
  'CHECKED_IN',
  'IN_USE',
  'AWAITING_APPROVAL',
  'PENDING_REVIEW',
  'OFFERED',
];

export interface CollisionCheckResult {
  hasConflict: boolean;
  conflictingBooking?: IBookingDocument;
  conflictDetails?: string;
}

export interface CreateBookingOptions {
  resourceId: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  intendedPurpose: string;
  safetyAcknowledgement: boolean;
  projectGrantCode?: string;
  supervisorEmail?: string;
  supervisorEndorsed?: boolean;
  idempotencyKey?: string;
  allowWaitlist?: boolean;
  bufferMinutes?: number;
  status?: BookingStatus;
  accessPin?: string;
}

export class ConcurrencyService {
  public async checkCollision(
    resourceId: string | mongoose.Types.ObjectId,
    requestedStart: Date,
    requestedEnd: Date,
    bufferMinutes: number = 0,
    excludeBookingId?: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<CollisionCheckResult> {
    const rId = new mongoose.Types.ObjectId(resourceId);
    const startMs = requestedStart.getTime();
    const endMs = requestedEnd.getTime();

    if (endMs <= startMs) {
      throw new BadRequestError('endTime must be strictly greater than startTime', 'MALFORMED_REQUEST');
    }

    const bufferMs = Math.max(0, bufferMinutes) * 60 * 1000;
    const effectiveStart = new Date(startMs - bufferMs);
    const effectiveEnd = new Date(endMs + bufferMs);

    const query: any = {
      resourceId: rId,
      status: { $in: OCCUPYING_STATUSES },
      startTime: { $lt: effectiveEnd },
      endTime: { $gt: effectiveStart },
    };

    if (excludeBookingId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }

    let queryBuilder = Booking.findOne(query);
    if (session) {
      queryBuilder = queryBuilder.session(session);
    }

    const conflict = await queryBuilder.exec();

    if (!conflict) {
      return { hasConflict: false };
    }

    const conflictDetails = `Requested slot [${requestedStart.toISOString()} - ${requestedEnd.toISOString()}) collides with existing booking ${conflict._id} [${conflict.startTime.toISOString()} - ${conflict.endTime.toISOString()}) in status '${conflict.status}'`;

    return {
      hasConflict: true,
      conflictingBooking: conflict,
      conflictDetails,
    };
  }

  public async assertNoBookingConflict(
    resourceId: string | mongoose.Types.ObjectId,
    requestedStart: Date,
    requestedEnd: Date,
    bufferMinutes: number = 0,
    excludeBookingId?: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    const result = await this.checkCollision(
      resourceId,
      requestedStart,
      requestedEnd,
      bufferMinutes,
      excludeBookingId,
      session
    );

    if (result.hasConflict && result.conflictingBooking) {
      throw new ConflictError(
        result.conflictDetails || 'The requested reservation window conflicts with an existing confirmed booking.',
        'SLOT_COLLISION'
      );
    }
  }

  public async createBookingWithAtomicLock(
    bookingData: CreateBookingOptions
  ): Promise<IBookingDocument> {
    const rId = new mongoose.Types.ObjectId(bookingData.resourceId);
    const uId = new mongoose.Types.ObjectId(bookingData.userId);
    const bufferMinutes = bookingData.bufferMinutes || 0;

    let session: ClientSession | null = null;
    let transactionSupported = false;

    try {
      session = await mongoose.startSession();
      if (session && typeof session.startTransaction === 'function') {
        session.startTransaction();
        transactionSupported = true;
      }
    } catch {
      session = null;
      transactionSupported = false;
    }

    try {
      await this.assertNoBookingConflict(
        rId,
        bookingData.startTime,
        bookingData.endTime,
        bufferMinutes,
        undefined,
        session || undefined
      );

      const durationMinutes = Math.round(
        (bookingData.endTime.getTime() - bookingData.startTime.getTime()) / (60 * 1000)
      );

      const newBooking = new Booking({
        resourceId: rId,
        userId: uId,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        durationMinutes,
        intendedPurpose: bookingData.intendedPurpose,
        safetyAcknowledgement: bookingData.safetyAcknowledgement,
        projectGrantCode: bookingData.projectGrantCode,
        supervisorEmail: bookingData.supervisorEmail,
        supervisorEndorsed: bookingData.supervisorEndorsed ?? false,
        idempotencyKey: bookingData.idempotencyKey,
        allowWaitlist: bookingData.allowWaitlist ?? false,
        bufferMinutes,
        status: bookingData.status || 'AWAITING_APPROVAL',
        accessPin: bookingData.accessPin,
      });

      const saved = await newBooking.save({ session: session || undefined });

      if (session && transactionSupported) {
        await session.commitTransaction();
      }

      return saved;
    } catch (err: any) {
      if (session && transactionSupported) {
        try {
          await session.abortTransaction();
        } catch {
        }
      }
      throw err;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch {
        }
      }
    }
  }

  public async approveBookingWithAtomicLock(
    bookingId: string | mongoose.Types.ObjectId,
    approverId: string | mongoose.Types.ObjectId,
    approvalNotes?: string,
    generatedPin?: string
  ): Promise<IBookingDocument> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError(`Booking ${bookingId} was not found`, 'BOOKING_NOT_FOUND');
    }

    if (booking.status !== 'AWAITING_APPROVAL' && booking.status !== 'PENDING_REVIEW') {
      throw new BadRequestError(
        `Booking ${bookingId} cannot be approved from current status '${booking.status}'`,
        'INVALID_STATE_TRANSITION'
      );
    }

    await this.assertNoBookingConflict(
      booking.resourceId,
      booking.startTime,
      booking.endTime,
      booking.bufferMinutes || 0,
      booking._id
    );

    booking.status = 'APPROVED';
    booking.reviewedBy = new mongoose.Types.ObjectId(approverId);
    booking.reviewedAt = new Date();
    if (approvalNotes) {
      booking.reviewNotes = approvalNotes;
    }
    if (generatedPin) {
      booking.accessPin = generatedPin;
    }

    return booking.save();
  }
}

export const concurrencyService = new ConcurrencyService();
export default concurrencyService;
