import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { waitlistService } from './waitlist.service';
import { Booking } from '../bookings/booking.model';
import { Resource } from '../resources/resource.model';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '../../middleware/error.middleware';

export class WaitlistController {
  public async addToWaitlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to join waitlist', 'AUTH_TOKEN_MISSING');
      }

      const { bookingId, resourceId, startTime, endTime, intendedPurpose, safetyAcknowledgement } = req.body;
      const userId = req.user.id;

      let targetBookingId: mongoose.Types.ObjectId;
      let targetResourceId: mongoose.Types.ObjectId;
      let targetStart: Date;
      let targetEnd: Date;

      if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          throw new NotFoundError(`Booking ${bookingId} not found`, 'BOOKING_NOT_FOUND');
        }
        if (booking.userId.toString() !== userId) {
          throw new ForbiddenError('You can only waitlist your own booking requests', 'FORBIDDEN_OBJECT_ACCESS');
        }

        targetBookingId = booking._id as mongoose.Types.ObjectId;
        targetResourceId = booking.resourceId as mongoose.Types.ObjectId;
        targetStart = new Date(booking.startTime);
        targetEnd = new Date(booking.endTime);
      } else {
        if (!resourceId || !startTime || !endTime) {
          throw new BadRequestError(
            'resourceId, startTime, and endTime are required to join waitlist',
            'MALFORMED_REQUEST'
          );
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end.getTime() <= start.getTime()) {
          throw new BadRequestError('endTime must be strictly greater than startTime', 'MALFORMED_REQUEST');
        }

        const resource = await Resource.findById(resourceId);
        if (!resource) {
          throw new NotFoundError(`Resource ${resourceId} not found`, 'RESOURCE_NOT_FOUND');
        }

        const durationMinutes = Math.round((end.getTime() - start.getTime()) / (60 * 1000));
        const newBooking = new Booking({
          resourceId: resource._id,
          userId: new mongoose.Types.ObjectId(userId),
          startTime: start,
          endTime: end,
          durationMinutes,
          intendedPurpose: intendedPurpose || 'Waitlisted equipment reservation',
          safetyAcknowledgement: safetyAcknowledgement ?? true,
          status: 'WAITLISTED',
          allowWaitlist: true,
          bufferMinutes: resource.bufferMinutes || 0,
        });

        await newBooking.save();

        targetBookingId = newBooking._id as mongoose.Types.ObjectId;
        targetResourceId = resource._id as mongoose.Types.ObjectId;
        targetStart = start;
        targetEnd = end;
      }

      const entry = await waitlistService.addToWaitlist(
        targetBookingId,
        userId,
        targetResourceId,
        targetStart,
        targetEnd
      );

      res.status(201).json({
        success: true,
        message: 'Successfully enqueued into fair priority waitlist.',
        waitlistEntry: entry,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getWaitlistForResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resourceId = (Array.isArray(req.params.resourceId) ? req.params.resourceId[0] : req.params.resourceId) as string;
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        throw new BadRequestError('Invalid resourceId parameter', 'MALFORMED_REQUEST');
      }

      const userId = req.user?.id;
      const result = await waitlistService.getWaitlistForResource(resourceId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async acceptOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to accept offer', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const result = await waitlistService.acceptOffer(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Waitlist offer successfully accepted. Your reservation is officially approved.',
        booking: result.booking,
        waitlistEntry: result.waitlistEntry,
        accessPin: result.accessPin,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getMyWaitlists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const waitlists = await waitlistService.getUserWaitlists(req.user.id);

      res.status(200).json({
        success: true,
        data: waitlists,
      });
    } catch (err) {
      next(err);
    }
  }

  public async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const result = await waitlistService.withdrawFromWaitlist(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Successfully withdrawn from waitlist queue.',
        waitlistEntry: result.waitlistEntry,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const waitlistController = new WaitlistController();
export default waitlistController;
