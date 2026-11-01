import { Router } from 'express';
import { inspectionController } from './inspection.controller';
import { authenticateUser } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate.middleware';
import {
  checkInInspectionSchema,
  returnInspectionSchema,
  getBookingInspectionsSchema,
} from './inspection.validation';

export const inspectionRouter: Router = Router();

inspectionRouter.use(authenticateUser);

inspectionRouter.post(
  '/check-in',
  validateBody(checkInInspectionSchema),
  inspectionController.checkIn.bind(inspectionController)
);

inspectionRouter.post(
  '/return',
  validateBody(returnInspectionSchema),
  inspectionController.return.bind(inspectionController)
);

inspectionRouter.get(
  '/booking/:bookingId',
  validateParams(getBookingInspectionsSchema),
  inspectionController.getByBookingId.bind(inspectionController)
);
