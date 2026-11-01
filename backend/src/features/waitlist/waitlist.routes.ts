import { Router } from 'express';
import { waitlistController } from './waitlist.controller';
import { authenticateUser, optionalAuthenticateUser } from '../../middleware/auth.middleware';

export const waitlistRouter: Router = Router();

waitlistRouter.get(
  '/resource/:resourceId',
  optionalAuthenticateUser,
  (req, res, next) => waitlistController.getWaitlistForResource(req, res, next)
);

waitlistRouter.get(
  '/my-waitlists',
  authenticateUser,
  (req, res, next) => waitlistController.getMyWaitlists(req, res, next)
);

waitlistRouter.post(
  '/',
  authenticateUser,
  (req, res, next) => waitlistController.addToWaitlist(req, res, next)
);

waitlistRouter.post(
  '/:id/accept',
  authenticateUser,
  (req, res, next) => waitlistController.acceptOffer(req, res, next)
);

waitlistRouter.delete(
  '/:id',
  authenticateUser,
  (req, res, next) => waitlistController.withdraw(req, res, next)
);

export default waitlistRouter;
