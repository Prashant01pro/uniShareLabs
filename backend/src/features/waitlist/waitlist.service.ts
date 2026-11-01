import mongoose from 'mongoose';
import { WaitlistEntry, IWaitlistEntryDocument, WaitlistStatus } from './waitlist.model';
import { Booking, IBookingDocument } from '../bookings/booking.model';
import { fairnessService } from '../fairness/fairness.service';
import { concurrencyService } from '../bookings/concurrency.service';
import { emitToUser, emitToResource, SOCKET_EVENTS } from '../../real-time/socket';
import { NotFoundError, ForbiddenError, BadRequestError, GoneError } from '../../middleware/error.middleware';

export interface WaitlistStatusResponse {
  totalWaitlisted: number;
  myPosition: number | null;
  fairnessScore: number;
  queue: Array<{
    id: string;
    priorityScore: number;
    requestedStart: Date;
    requestedEnd: Date;
    status: WaitlistStatus;
    createdAt: Date;
  }>;
}

export class WaitlistService {
  public async addToWaitlist(
    bookingId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    resourceId: string | mongoose.Types.ObjectId,
    requestedStart: Date,
    requestedEnd: Date
  ): Promise<IWaitlistEntryDocument> {
    const bId = new mongoose.Types.ObjectId(bookingId);
    const uId = new mongoose.Types.ObjectId(userId);
    const rId = new mongoose.Types.ObjectId(resourceId);

    const scoreBreakdown = await fairnessService.calculateFairnessScore(uId, {
      resourceId: rId.toString(),
      targetDate: requestedStart,
      queuedAt: new Date(),
    });

    const entry = new WaitlistEntry({
      resourceId: rId,
      userId: uId,
      bookingId: bId,
      requestedStart,
      requestedEnd,
      priorityScore: scoreBreakdown.score,
      fairnessComponents: scoreBreakdown.components,
      status: 'QUEUED',
    });

    const savedEntry = await entry.save();

    await Booking.findByIdAndUpdate(bId, {
      status: 'WAITLISTED',
      fairnessScore: scoreBreakdown.score,
      allowWaitlist: true,
    });

    return savedEntry;
  }

  public async getWaitlistForResource(
    resourceId: string | mongoose.Types.ObjectId,
    userId?: string | mongoose.Types.ObjectId
  ): Promise<WaitlistStatusResponse> {
    const rId = new mongoose.Types.ObjectId(resourceId);

    const activeEntries = await WaitlistEntry.find({
      resourceId: rId,
      status: { $in: ['QUEUED', 'OFFERED'] },
    }).sort({ priorityScore: -1, createdAt: 1 });

    const totalWaitlisted = activeEntries.length;
    let myPosition: number | null = null;
    let userScore = 0;

    if (userId) {
      const uIdStr = userId.toString();
      const index = activeEntries.findIndex((e) => e.userId.toString() === uIdStr);
      if (index !== -1) {
        myPosition = index + 1; 
        userScore = activeEntries[index].priorityScore;
      } else {
        const scoreBreakdown = await fairnessService.calculateFairnessScore(userId, {
          resourceId: rId.toString(),
        });
        userScore = scoreBreakdown.score;
      }
    }

    const queue = activeEntries.map((e) => ({
      id: e._id.toString(),
      priorityScore: e.priorityScore,
      requestedStart: e.requestedStart,
      requestedEnd: e.requestedEnd,
      status: e.status,
      createdAt: e.createdAt,
    }));

    return {
      totalWaitlisted,
      myPosition,
      fairnessScore: userScore,
      queue,
    };
  }

  public async promoteNextCandidate(
    resourceId: string | mongoose.Types.ObjectId,
    freedStart: Date,
    freedEnd: Date
  ): Promise<IWaitlistEntryDocument | null> {
    await this.expireStaleOffers();

    const rId = new mongoose.Types.ObjectId(resourceId);

    const candidates = await WaitlistEntry.find({
      resourceId: rId,
      status: 'QUEUED',
      requestedStart: { $lt: freedEnd },
      requestedEnd: { $gt: freedStart },
    }).sort({ priorityScore: -1, createdAt: 1 });

    if (candidates.length === 0) {
      return null;
    }

    const topCandidate = candidates[0];

    const conflictResult = await concurrencyService.checkCollision(
      rId,
      topCandidate.requestedStart,
      topCandidate.requestedEnd,
      0,
      topCandidate.bookingId
    );

    if (conflictResult.hasConflict) {
      topCandidate.status = 'EXPIRED';
      await topCandidate.save();
      return this.promoteNextCandidate(resourceId, freedStart, freedEnd);
    }

    const now = new Date();
    const offerExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); 

    topCandidate.status = 'OFFERED';
    topCandidate.offerExpiresAt = offerExpiresAt;
    topCandidate.notificationSentAt = now;
    await topCandidate.save();

    await Booking.findByIdAndUpdate(topCandidate.bookingId, {
      status: 'OFFERED',
      offerExpiresAt,
    });

    emitToUser(topCandidate.userId.toString(), SOCKET_EVENTS.WAITLIST_PROMOTED, {
      bookingId: topCandidate.bookingId.toString(),
      waitlistEntryId: topCandidate._id.toString(),
      resourceId: rId.toString(),
      slotInterval: {
        startTime: topCandidate.requestedStart,
        endTime: topCandidate.requestedEnd,
      },
      offerExpiresAt,
      message: 'A reserved time slot has opened! You have 2 hours to confirm and accept this booking offer.',
    });

    emitToResource(rId.toString(), SOCKET_EVENTS.RESOURCE_STATUS_CHANGED, {
      resourceId: rId.toString(),
      action: 'WAITLIST_OFFER_ISSUED',
      offeredUntil: offerExpiresAt,
    });

    return topCandidate;
  }

  public async acceptOffer(
    waitlistId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<{ booking: IBookingDocument; waitlistEntry: IWaitlistEntryDocument; accessPin: string }> {
    const entry = await WaitlistEntry.findById(waitlistId);
    if (!entry) {
      throw new NotFoundError(`Waitlist entry ${waitlistId} was not found`, 'NOT_FOUND');
    }

    if (entry.userId.toString() !== userId.toString()) {
      throw new ForbiddenError(
        'You are not authorized to accept this waitlist offer',
        'FORBIDDEN_OBJECT_ACCESS'
      );
    }

    if (entry.status !== 'OFFERED') {
      throw new BadRequestError(
        `Cannot accept waitlist offer in '${entry.status}' status. Only OFFERED status can be accepted.`,
        'INVALID_STATE_TRANSITION'
      );
    }

    if (entry.isOfferExpired()) {
      entry.status = 'EXPIRED';
      await entry.save();

      await this.promoteNextCandidate(entry.resourceId, entry.requestedStart, entry.requestedEnd);

      throw new GoneError(
        'This waitlist offer has expired. The 2-hour confirmation window elapsed and the slot has been offered to the next candidate.',
        'WAITLIST_OFFER_EXPIRED'
      );
    }

    await concurrencyService.assertNoBookingConflict(
      entry.resourceId,
      entry.requestedStart,
      entry.requestedEnd,
      0,
      entry.bookingId
    );

    const accessPin = Math.floor(1000 + Math.random() * 9000).toString();

    entry.status = 'ACCEPTED';
    entry.acceptedAt = new Date();
    await entry.save();

    const booking = await Booking.findById(entry.bookingId);
    if (!booking) {
      throw new NotFoundError(`Associated booking ${entry.bookingId} not found`, 'BOOKING_NOT_FOUND');
    }

    booking.status = 'APPROVED';
    booking.accessPin = accessPin;
    booking.reviewedAt = new Date();
    booking.reviewNotes = 'Automatically approved via accepted waitlist offer.';
    await booking.save();

    emitToUser(userId.toString(), SOCKET_EVENTS.BOOKING_APPROVED, {
      bookingId: booking._id.toString(),
      status: 'APPROVED',
      startTime: booking.startTime,
      endTime: booking.endTime,
      accessPin,
      message: 'Waitlist offer accepted! Your reservation is officially confirmed.',
    });

    return {
      booking,
      waitlistEntry: entry,
      accessPin,
    };
  }

  public async withdrawFromWaitlist(
    waitlistId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<{ success: boolean; waitlistEntry: IWaitlistEntryDocument }> {
    const entry = await WaitlistEntry.findById(waitlistId);
    if (!entry) {
      throw new NotFoundError(`Waitlist entry ${waitlistId} was not found`, 'NOT_FOUND');
    }

    if (entry.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to withdraw this waitlist entry', 'FORBIDDEN_OBJECT_ACCESS');
    }

    const wasOffered = entry.status === 'OFFERED';
    entry.status = 'CANCELLED';
    await entry.save();

    await Booking.findByIdAndUpdate(entry.bookingId, {
      status: 'CANCELLED',
      cancellationReason: 'User withdrew from waitlist queue.',
      cancelledAt: new Date(),
    });

    if (wasOffered) {
      await this.promoteNextCandidate(entry.resourceId, entry.requestedStart, entry.requestedEnd);
    }

    return { success: true, waitlistEntry: entry };
  }

  public async getUserWaitlists(userId: string | mongoose.Types.ObjectId): Promise<IWaitlistEntryDocument[]> {
    const uId = new mongoose.Types.ObjectId(userId);
    return WaitlistEntry.find({
      userId: uId,
      status: { $in: ['QUEUED', 'OFFERED'] },
    })
      .populate('resourceId')
      .populate('bookingId')
      .sort({ createdAt: -1 });
  }

  public async expireStaleOffers(): Promise<number> {
    const now = new Date();
    const staleOffers = await WaitlistEntry.find({
      status: 'OFFERED',
      offerExpiresAt: { $lt: now },
    });

    let expiredCount = 0;
    for (const offer of staleOffers) {
      offer.status = 'EXPIRED';
      await offer.save();

      await Booking.findByIdAndUpdate(offer.bookingId, {
        status: 'WAITLISTED',
        offerExpiresAt: undefined,
      });

      expiredCount++;

      await this.promoteNextCandidate(offer.resourceId, offer.requestedStart, offer.requestedEnd);
    }

    return expiredCount;
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;
