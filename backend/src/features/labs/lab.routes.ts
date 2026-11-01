import { Router } from 'express';
import { labController } from './lab.controller';
import { authenticateUser, requireRoles } from '../../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware';
import { createLabSchema, updateLabSchema, labIdParamSchema, labQuerySchema } from './lab.validation';

export const labRouter: Router = Router();

labRouter.post(
  '/',
  authenticateUser,
  requireRoles('ADMIN', 'LAB_MANAGER', 'RESOURCE_OWNER'),
  validateBody(createLabSchema),
  (req, res, next) => labController.createLab(req, res).catch(next)
);

labRouter.get(
  '/',
  validateQuery(labQuerySchema),
  (req, res, next) => labController.listLabs(req, res).catch(next)
);

labRouter.get(
  '/:id',
  validateParams(labIdParamSchema),
  (req, res, next) => labController.getLabById(req, res).catch(next)
);

labRouter.patch(
  '/:id',
  authenticateUser,
  validateParams(labIdParamSchema),
  validateBody(updateLabSchema),
  (req, res, next) => labController.updateLab(req, res).catch(next)
);

labRouter.put(
  '/:id',
  authenticateUser,
  validateParams(labIdParamSchema),
  validateBody(updateLabSchema),
  (req, res, next) => labController.updateLab(req, res).catch(next)
);
