import { Router } from 'express';
import { resourceController } from './resource.controller';
import {
  authenticateUser,
  optionalAuthenticateUser,
  requireRoles,
} from '../../middleware/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middleware/validate.middleware';
import {
  createResourceSchema,
  updateResourceSchema,
  resourceIdParamSchema,
  resourceQuerySchema,
  eligibilityQuerySchema,
} from './resource.validation';

export const resourceRouter: Router = Router();

resourceRouter.post(
  '/',
  authenticateUser,
  requireRoles('ADMIN', 'LAB_MANAGER', 'RESOURCE_OWNER'),
  validateBody(createResourceSchema),
  (req, res, next) => resourceController.createResource(req, res).catch(next)
);

resourceRouter.get(
  '/',
  optionalAuthenticateUser,
  validateQuery(resourceQuerySchema),
  (req, res, next) => resourceController.listResources(req, res).catch(next)
);

resourceRouter.get(
  '/:id/eligibility',
  authenticateUser,
  validateParams(resourceIdParamSchema),
  validateQuery(eligibilityQuerySchema),
  (req, res, next) => resourceController.checkEligibility(req, res).catch(next)
);

resourceRouter.get(
  '/:id',
  validateParams(resourceIdParamSchema),
  (req, res, next) => resourceController.getResourceById(req, res).catch(next)
);

resourceRouter.patch(
  '/:id',
  authenticateUser,
  validateParams(resourceIdParamSchema),
  validateBody(updateResourceSchema),
  (req, res, next) => resourceController.updateResource(req, res).catch(next)
);

resourceRouter.put(
  '/:id',
  authenticateUser,
  validateParams(resourceIdParamSchema),
  validateBody(updateResourceSchema),
  (req, res, next) => resourceController.updateResource(req, res).catch(next)
);

resourceRouter.post(
  '/:id/maintenance',
  authenticateUser,
  validateParams(resourceIdParamSchema),
  (req, res, next) => resourceController.scheduleMaintenance(req, res).catch(next)
);
