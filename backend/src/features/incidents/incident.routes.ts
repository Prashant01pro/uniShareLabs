import { Router } from 'express';
import { incidentController } from './incident.controller';
import { authenticateUser, requireRoles } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import {
  createIncidentSchema,
  resolveIncidentSchema,
  disputeIncidentSchema,
  queryIncidentsSchema,
} from './incident.validation';

export const incidentRouter: Router = Router();

incidentRouter.use(authenticateUser);

incidentRouter.post('/', validateBody(createIncidentSchema), incidentController.createIncident.bind(incidentController));

incidentRouter.get('/', validateQuery(queryIncidentsSchema), incidentController.getIncidents.bind(incidentController));

incidentRouter.get('/:id', incidentController.getIncidentById.bind(incidentController));

incidentRouter.patch(
  '/:id/resolve',
  requireRoles('LAB_MANAGER', 'ADMIN', 'RESOURCE_OWNER'),
  validateBody(resolveIncidentSchema),
  incidentController.resolveIncident.bind(incidentController)
);

incidentRouter.post(
  '/:id/resolve',
  requireRoles('LAB_MANAGER', 'ADMIN', 'RESOURCE_OWNER'),
  validateBody(resolveIncidentSchema),
  incidentController.resolveIncident.bind(incidentController)
);

incidentRouter.post(
  '/:id/adjudicate',
  requireRoles('LAB_MANAGER', 'ADMIN'),
  validateBody(resolveIncidentSchema),
  incidentController.resolveIncident.bind(incidentController)
);

incidentRouter.post(
  '/:id/dispute',
  validateBody(disputeIncidentSchema),
  incidentController.disputeIncident.bind(incidentController)
);
