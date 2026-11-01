import { Router } from 'express';
import { bookingController } from './booking.controller';
import {
  createBookingSchema,
  cancelBookingSchema,
  approveBookingSchema,
  rejectBookingSchema,
  delegateBookingSchema,
  queryBookingsSchema,
  bookingIdParamSchema,
} from './booking.validation';
import { authenticateUser, requireRoles } from '../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.middleware';

export const bookingRouter: Router = Router();

bookingRouter.get(
  '/pending-reviews',
  authenticateUser,
  requireRoles('RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'),
  (req, res, next) => bookingController.getPendingReviews(req, res, next)
);

bookingRouter.get(
  '/review-queue',
  authenticateUser,
  requireRoles('RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'),
  (req, res, next) => bookingController.getPendingReviews(req, res, next)
);

bookingRouter.post(
  '/',
  authenticateUser,
  validateBody(createBookingSchema),
  (req, res, next) => bookingController.createBooking(req, res, next)
);

bookingRouter.get(
  '/',
  authenticateUser,
  validateQuery(queryBookingsSchema),
  (req, res, next) => bookingController.getBookings(req, res, next)
);

bookingRouter.get(
  '/:id',
  authenticateUser,
  validateParams(bookingIdParamSchema),
  (req, res, next) => bookingController.getBookingById(req, res, next)
);

bookingRouter.patch(
  '/:id/cancel',
  authenticateUser,
  validateParams(bookingIdParamSchema),
  validateBody(cancelBookingSchema),
  (req, res, next) => bookingController.cancelBooking(req, res, next)
);

bookingRouter.post(
  '/:id/approve',
  authenticateUser,
  requireRoles('RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'),
  validateParams(bookingIdParamSchema),
  validateBody(approveBookingSchema),
  (req, res, next) => bookingController.approveBooking(req, res, next)
);

bookingRouter.post(
  '/:id/reject',
  authenticateUser,
  requireRoles('RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'),
  validateParams(bookingIdParamSchema),
  validateBody(rejectBookingSchema),
  (req, res, next) => bookingController.rejectBooking(req, res, next)
);

bookingRouter.post(
  '/:id/delegate',
  authenticateUser,
  requireRoles('RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'),
  validateParams(bookingIdParamSchema),
  validateBody(delegateBookingSchema),
  (req, res, next) => bookingController.delegateBooking(req, res, next)
);

export default bookingRouter;
