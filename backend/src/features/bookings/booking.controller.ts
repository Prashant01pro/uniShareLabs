import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Booking, IBookingDocument } from './booking.model';
import { Resource, IResourceDocument } from '../resources/resource.model';
import { User, IUserDocument } from '../auth/user.model';
import { concurrencyService } from './concurrency.service';
import { fairnessService } from '../fairness/fairness.service';
import { waitlistService } from '../waitlist/waitlist.service';
import { emitToUser, emitToResource, emitToManagers, SOCKET_EVENTS } from '../../real-time/socket';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnauthorizedError,
} from '../../middleware/error.middleware';
import {
  CreateBookingInput,
  CancelBookingInput,
  ApproveBookingInput,
  RejectBookingInput,
  QueryBookingsInput,
} from './booking.validation';

export class BookingController {
  private async runDeterministicVerification(
    user: IUserDocument,
    resource: IResourceDocument,
    startTime: Date,
    endTime: Date,
    durationHours: number,
    allowWaitlist: boolean = false
  ): Promise<{ passed: boolean; waitlistRequired: boolean; conflictBookingId?: string }> {
    const calendar = resource.calendar;
    const opHours = resource.operatingHours;
    const allowedDays = calendar?.allowedDays || opHours?.allowedDays;
    const dailyStartTime = calendar?.dailyStartTime || opHours?.dailyStartTime || '08:00';
    const dailyEndTime = calendar?.dailyEndTime || opHours?.dailyEndTime || '20:00';

    if (allowedDays && allowedDays.length > 0) {
      const jsDay = startTime.getUTCDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      if (!allowedDays.includes(isoDay)) {
        throw new BadRequestError(
          `Resource '${resource.title || resource.code}' is not operational on day of week ${isoDay}`,
          'MALFORMED_REQUEST'
        );
      }
    }

    const startH = startTime.getUTCHours();
    const startM = startTime.getUTCMinutes();
    const startMins = startH * 60 + startM;

    const endH = endTime.getUTCHours();
    const endM = endTime.getUTCMinutes();
    const endMins = endH * 60 + endM;

    const [limitStartH, limitStartM] = dailyStartTime.split(':').map(Number);
    const [limitEndH, limitEndM] = dailyEndTime.split(':').map(Number);
    const minOperatingMins = limitStartH * 60 + limitStartM;
    const maxOperatingMins = limitEndH * 60 + limitEndM;

    if (startMins < minOperatingMins || endMins > maxOperatingMins) {
      throw new BadRequestError(
        `Booking slot [${startTime.toISOString()} - ${endTime.toISOString()}) falls outside operational hours (${dailyStartTime} - ${dailyEndTime})`,
        'MALFORMED_REQUEST'
      );
    }

    const durationMins = durationHours * 60;
    const minDuration = calendar?.minDurationMinutes || 30;
    const maxDuration = calendar?.maxDurationMinutes || 240;
    if (durationMins < minDuration || durationMins > maxDuration) {
      throw new BadRequestError(
        `Requested duration of ${durationMins} minutes violates limits [min: ${minDuration}m, max: ${maxDuration}m]`,
        'MALFORMED_REQUEST'
      );
    }

    const nowMs = Date.now();
    const advanceMaxDays = calendar?.advanceBookingDaysMax || 14;
    const maxAdvanceMs = advanceMaxDays * 24 * 60 * 60 * 1000;
    if (startTime.getTime() - nowMs > maxAdvanceMs) {
      throw new BadRequestError(
        `Bookings cannot be scheduled more than ${advanceMaxDays} days in advance`,
        'MALFORMED_REQUEST'
      );
    }

    const leadTimeMins = calendar?.leadTimeMinutesMin || (resource.leadTimeHours || 1) * 60;
    if (startTime.getTime() - nowMs < leadTimeMins * 60 * 1000) {
      throw new BadRequestError(
        `Bookings require at least ${leadTimeMins} minutes advance lead time`,
        'MALFORMED_REQUEST'
      );
    }

    if (typeof resource.hasMaintenanceCollision === 'function' && resource.hasMaintenanceCollision(startTime, endTime)) {
      throw new ConflictError(
        'The requested reservation window intersects with a scheduled maintenance blackout window',
        'MAINTENANCE_OVERLAP'
      );
    }

    const collision = await concurrencyService.checkCollision(
      resource._id,
      startTime,
      endTime,
      resource.bufferMinutes || 0
    );

    if (collision.hasConflict) {
      if (allowWaitlist) {
        return {
          passed: true,
          waitlistRequired: true,
          conflictBookingId: collision.conflictingBooking?._id?.toString(),
        };
      }
      throw new ConflictError(
        collision.conflictDetails || 'Requested slot is already reserved by another booking.',
        'SLOT_COLLISION'
      );
    }

    await fairnessService.verifyQuota(user._id, startTime, durationHours, resource._id.toString());

    await fairnessService.verifyCooldown(
      user._id,
      resource._id,
      startTime,
      resource.cooldownMinutes || 120
    );

    const prereqs = resource.prerequisites;
    if (prereqs) {
      const roleRank: Record<string, number> = {
        STUDENT: 1,
        RESEARCHER: 2,
        RESOURCE_OWNER: 3,
        LAB_MANAGER: 4,
        ADMIN: 5,
      };
      const minRoleRank = roleRank[prereqs.minRole || 'STUDENT'] || 1;
      const userRoleRank = roleRank[user.role] || 1;

      if (userRoleRank < minRoleRank) {
        throw new ForbiddenError(
          `Insufficient role: This instrument requires minimum role '${prereqs.minRole}'. Current role: '${user.role}'`,
          'FORBIDDEN_INSUFFICIENT_ROLE'
        );
      }

      if (prereqs.requiredCertifications && prereqs.requiredCertifications.length > 0) {
        for (const reqCert of prereqs.requiredCertifications) {
          const hasCert = user.hasValidCertification(reqCert.certCode, endTime);
          if (!hasCert) {
            throw new ForbiddenError(
              `Missing active certification: '${reqCert.name}' (${reqCert.certCode}) is required and must remain valid through the end of the booking session (${endTime.toISOString()})`,
              'FORBIDDEN_INSUFFICIENT_ROLE'
            );
          }
        }
      }

      if (prereqs.requiredSafetyTrainings && prereqs.requiredSafetyTrainings.length > 0) {
        const userTrainings = user.safetyTrainingsCompleted || [];
        for (const reqTrain of prereqs.requiredSafetyTrainings) {
          if (!userTrainings.includes(reqTrain)) {
            throw new ForbiddenError(
              `Mandatory safety training prerequisite incomplete: '${reqTrain}' must be completed before booking this resource.`,
              'FORBIDDEN_INSUFFICIENT_ROLE'
            );
          }
        }
      }
    }

    return { passed: true, waitlistRequired: false };
  }

  public async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to submit bookings', 'AUTH_TOKEN_MISSING');
      }

      const input = req.body as CreateBookingInput;
      const userId = req.user.id;
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || undefined;

      const [user, resource] = await Promise.all([
        User.findById(userId),
        Resource.findById(input.resourceId),
      ]);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`, 'USER_NOT_FOUND');
      }
      if (user.isSuspended) {
        throw new ForbiddenError(
          `Account suspended: ${user.suspensionReason || 'Contact facility administration.'}`,
          'ACCOUNT_SUSPENDED'
        );
      }
      if (!user.isActive) {
        throw new ForbiddenError('Account is currently inactive', 'ACCOUNT_INACTIVE');
      }

      if (!resource) {
        throw new NotFoundError(`Resource ${input.resourceId} not found`, 'RESOURCE_NOT_FOUND');
      }
      if (resource.status !== 'AVAILABLE') {
        throw new BadRequestError(
          `Resource '${resource.title || resource.code}' is currently in '${resource.status}' status and cannot accept reservations`,
          'MALFORMED_REQUEST'
        );
      }

      if (resource.prerequisites?.supervisorEndorsementRequired && !input.supervisorEndorsed) {
        throw new BadRequestError(
          'This instrument requires explicit supervisor endorsement before reservation',
          'MALFORMED_REQUEST'
        );
      }

      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
      const durationHours = Number((durationMinutes / 60).toFixed(2));

      const verificationResult = await this.runDeterministicVerification(
        user,
        resource,
        startTime,
        endTime,
        durationHours,
        input.allowWaitlist
      );

      if (verificationResult.waitlistRequired) {
        const waitlistedBooking = new Booking({
          resourceId: resource._id,
          userId: user._id,
          startTime,
          endTime,
          durationMinutes,
          intendedPurpose: input.intendedPurpose,
          safetyAcknowledgement: input.safetyAcknowledgement,
          projectGrantCode: input.projectGrantCode,
          supervisorEmail: input.supervisorEmail,
          supervisorEndorsed: input.supervisorEndorsed ?? false,
          idempotencyKey,
          allowWaitlist: true,
          bufferMinutes: resource.bufferMinutes || 0,
          status: 'WAITLISTED',
        });

        await waitlistedBooking.save();

        const waitlistEntry = await waitlistService.addToWaitlist(
          waitlistedBooking._id,
          user._id,
          resource._id,
          startTime,
          endTime
        );

        res.status(201).json({
          success: true,
          message: 'Requested slot is currently occupied. You have been successfully placed in the fair waitlist queue.',
          waitlist: true,
          booking: waitlistedBooking,
          waitlistEntry,
        });
        return;
      }

      const isAutoApprove = resource.approvalMode === 'AUTOMATIC';
      const initialStatus = isAutoApprove ? 'APPROVED' : 'AWAITING_APPROVAL';
      const generatedPin = isAutoApprove ? Math.floor(1000 + Math.random() * 9000).toString() : undefined;

      const createdBooking = await concurrencyService.createBookingWithAtomicLock({
        resourceId: resource._id,
        userId: user._id,
        startTime,
        endTime,
        intendedPurpose: input.intendedPurpose,
        safetyAcknowledgement: input.safetyAcknowledgement,
        projectGrantCode: input.projectGrantCode,
        supervisorEmail: input.supervisorEmail,
        supervisorEndorsed: input.supervisorEndorsed ?? false,
        idempotencyKey,
        allowWaitlist: input.allowWaitlist ?? false,
        bufferMinutes: resource.bufferMinutes || 0,
        status: initialStatus,
        accessPin: generatedPin,
      });

      emitToManagers(SOCKET_EVENTS.BOOKING_CREATED, {
        bookingId: createdBooking._id.toString(),
        resourceId: resource._id.toString(),
        resourceName: resource.title || resource.code,
        userId: user._id.toString(),
        userName: user.name,
        startTime: createdBooking.startTime,
        endTime: createdBooking.endTime,
        status: createdBooking.status,
      });

      emitToResource(resource._id.toString(), SOCKET_EVENTS.BOOKING_CREATED, {
        bookingId: createdBooking._id.toString(),
        startTime: createdBooking.startTime,
        endTime: createdBooking.endTime,
      });

      if (isAutoApprove) {
        emitToUser(user._id.toString(), SOCKET_EVENTS.BOOKING_APPROVED, {
          bookingId: createdBooking._id.toString(),
          accessPin: generatedPin,
          startTime: createdBooking.startTime,
          endTime: createdBooking.endTime,
          autoApproved: true,
        });
      }

      res.status(201).json({
        success: true,
        message: isAutoApprove
          ? 'Booking confirmed and automatically approved.'
          : 'Booking submitted successfully; routed to facility review queue.',
        booking: createdBooking,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const queryInput = req.query as unknown as QueryBookingsInput;
      const page = Math.max(1, Number(queryInput.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(queryInput.limit) || 20));
      const skip = (page - 1) * limit;

      const filter: any = {};

      if (req.user.role === 'STUDENT' || req.user.role === 'RESEARCHER') {
        filter.userId = new mongoose.Types.ObjectId(req.user.id);
      } else if (queryInput.userId) {
        filter.userId = new mongoose.Types.ObjectId(queryInput.userId);
      }

      if (queryInput.resourceId) {
        filter.resourceId = new mongoose.Types.ObjectId(queryInput.resourceId);
      }

      if (queryInput.status) {
        filter.status = queryInput.status;
      }

      if (queryInput.startDate || queryInput.endDate) {
        filter.startTime = {};
        if (queryInput.startDate) filter.startTime.$gte = new Date(queryInput.startDate);
        if (queryInput.endDate) filter.startTime.$lte = new Date(queryInput.endDate);
      }

      const [total, bookings] = await Promise.all([
        Booking.countDocuments(filter),
        Booking.find(filter)
          .populate('resourceId', 'title name code category department labLocation bufferMinutes')
          .populate('userId', 'name email role department')
          .sort({ startTime: -1 })
          .skip(skip)
          .limit(limit),
      ]);

      res.status(200).json({
        success: true,
        data: bookings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const booking = await Booking.findById(id)
        .populate('resourceId')
        .populate('userId', 'name email role department trustScore reputationScore')
        .populate('reviewedBy', 'name email role');

      if (!booking) {
        throw new NotFoundError(`Booking ${id} was not found`, 'BOOKING_NOT_FOUND');
      }

      const isOwner = booking.userId?._id?.toString() === req.user.id;
      const isPrivileged = ['RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'].includes(req.user.role);

      if (!isOwner && !isPrivileged) {
        throw new ForbiddenError(
          'You do not have permission to view this reservation',
          'FORBIDDEN_OBJECT_ACCESS'
        );
      }

      res.status(200).json({
        success: true,
        booking,
      });
    } catch (err) {
      next(err);
    }
  }

  public async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const input = req.body as CancelBookingInput;

      const booking = await Booking.findById(id);
      if (!booking) {
        throw new NotFoundError(`Booking ${id} was not found`, 'BOOKING_NOT_FOUND');
      }

      const isOwner = booking.userId.toString() === req.user.id;
      const isManagerOrAdmin = ['RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'].includes(req.user.role);
      if (!isOwner && !isManagerOrAdmin) {
        throw new ForbiddenError(
          'You do not have permission to cancel this booking',
          'FORBIDDEN_OBJECT_ACCESS'
        );
      }

      if (booking.status === 'CANCELLED') {
        res.status(200).json({
          success: true,
          message: 'Booking was already cancelled',
          booking,
        });
        return;
      }

      const previousStatus = booking.status;
      await booking.transitionTo('CANCELLED', req.user.id, input.cancellationReason);

      let promotedCandidate = null;
      if (['APPROVED', 'AWAITING_APPROVAL', 'PENDING_REVIEW'].includes(previousStatus)) {
        promotedCandidate = await waitlistService.promoteNextCandidate(
          booking.resourceId,
          booking.startTime,
          booking.endTime
        );
      }

      emitToResource(booking.resourceId.toString(), SOCKET_EVENTS.RESOURCE_STATUS_CHANGED, {
        resourceId: booking.resourceId.toString(),
        action: 'BOOKING_CANCELLED',
        cancelledSlot: { startTime: booking.startTime, endTime: booking.endTime },
      });

      res.status(200).json({
        success: true,
        message: 'Booking successfully cancelled.',
        booking,
        promotedWaitlistCandidate: promotedCandidate ? promotedCandidate._id : null,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getPendingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const query: any = {
        status: { $in: ['AWAITING_APPROVAL', 'PENDING_REVIEW'] },
      };

      if (req.user.role === 'RESOURCE_OWNER') {
        const ownedResources = await Resource.find({ ownerId: req.user.id }).select('_id');
        const ownedIds = ownedResources.map((r) => r._id);
        query.resourceId = { $in: ownedIds };
      }

      const pendingBookings = await Booking.find(query)
        .populate('resourceId', 'title name code category department labLocation bufferMinutes')
        .populate('userId', 'name email role department trustScore reputationScore')
        .sort({ createdAt: 1 });

      const now = Date.now();
      const enriched = pendingBookings.map((b) => {
        const createdMs = new Date(b.createdAt).getTime();
        const elapsedHours = (now - createdMs) / (60 * 60 * 1000);
        const slaTotalHours = 24;
        const remainingSlaHours = Number(Math.max(0, slaTotalHours - elapsedHours).toFixed(1));

        let slaUrgency: 'NORMAL' | 'WARNING' | 'BREACHED' = 'NORMAL';
        if (remainingSlaHours <= 0) slaUrgency = 'BREACHED';
        else if (remainingSlaHours <= 4) slaUrgency = 'WARNING';

        return {
          ...b.toObject(),
          sla: {
            slaTotalHours,
            elapsedHours: Number(elapsedHours.toFixed(1)),
            remainingSlaHours,
            slaUrgency,
          },
        };
      });

      res.status(200).json({
        success: true,
        totalPending: enriched.length,
        bookings: enriched,
      });
    } catch (err) {
      next(err);
    }
  }

  public async approveBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const input = req.body as ApproveBookingInput;

      const accessPin = Math.floor(1000 + Math.random() * 9000).toString();

      const approvedBooking = await concurrencyService.approveBookingWithAtomicLock(
        id,
        req.user.id,
        input.approvalNotes,
        accessPin
      );

      emitToUser(approvedBooking.userId.toString(), SOCKET_EVENTS.BOOKING_APPROVED, {
        bookingId: approvedBooking._id.toString(),
        status: 'APPROVED',
        startTime: approvedBooking.startTime,
        endTime: approvedBooking.endTime,
        accessPin,
        message: 'Your reservation has been approved by the facility reviewer.',
      });

      res.status(200).json({
        success: true,
        message: 'Booking successfully approved.',
        booking: approvedBooking,
      });
    } catch (err) {
      next(err);
    }
  }

  public async rejectBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const input = req.body as RejectBookingInput;

      const booking = await Booking.findById(id);
      if (!booking) {
        throw new NotFoundError(`Booking ${id} was not found`, 'BOOKING_NOT_FOUND');
      }

      if (booking.status !== 'AWAITING_APPROVAL' && booking.status !== 'PENDING_REVIEW') {
        throw new BadRequestError(
          `Cannot reject booking in '${booking.status}' status. Only pending bookings can be rejected.`,
          'INVALID_STATE_TRANSITION'
        );
      }

      booking.status = 'REJECTED';
      booking.reviewedBy = new mongoose.Types.ObjectId(req.user.id);
      booking.reviewedAt = new Date();
      booking.rejectionReasonCode = input.reasonCode;
      booking.rejectionMessage = input.rejectionMessage;
      await booking.save();

      emitToUser(booking.userId.toString(), SOCKET_EVENTS.BOOKING_REJECTED, {
        bookingId: booking._id.toString(),
        status: 'REJECTED',
        reasonCode: input.reasonCode,
        message: input.rejectionMessage || 'Your booking request was rejected.',
      });

      res.status(200).json({
        success: true,
        message: 'Booking successfully rejected.',
        booking,
      });
    } catch (err) {
      next(err);
    }
  }

  public async delegateBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { delegateUserId, note } = req.body;

      const [booking, delegate] = await Promise.all([
        Booking.findById(id),
        User.findById(delegateUserId),
      ]);

      if (!booking) {
        throw new NotFoundError(`Booking ${id} not found`, 'BOOKING_NOT_FOUND');
      }
      if (!delegate) {
        throw new NotFoundError(`Delegate user ${delegateUserId} not found`, 'USER_NOT_FOUND');
      }

      booking.assignedDelegate = new mongoose.Types.ObjectId(delegateUserId);
      if (note) {
        booking.reviewNotes = booking.reviewNotes
          ? `${booking.reviewNotes} | Delegation Note: ${note}`
          : `Delegation Note: ${note}`;
      }
      await booking.save();

      emitToUser(delegateUserId, SOCKET_EVENTS.SYSTEM_NOTIFICATION, {
        type: 'REVIEW_TICKET_DELEGATED',
        bookingId: booking._id.toString(),
        message: `A booking review ticket has been delegated to you by ${req.user.name}.`,
      });

      res.status(200).json({
        success: true,
        message: `Booking successfully delegated to ${delegate.name}.`,
        booking,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const bookingController = new BookingController();
export default bookingController;
