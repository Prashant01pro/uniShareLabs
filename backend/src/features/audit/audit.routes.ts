import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticateUser, requireRoles } from '../../middleware/auth.middleware';

export const auditRouter: Router = Router();

auditRouter.use(authenticateUser);

auditRouter.get('/logs', auditController.getLogs.bind(auditController));
auditRouter.get('/ledger', auditController.getLogs.bind(auditController));

auditRouter.get(
  '/verify-chain',
  requireRoles('LAB_MANAGER', 'ADMIN', 'RESOURCE_OWNER'),
  auditController.verifyChain.bind(auditController)
);

auditRouter.get(
  '/analytics/utilization',
  requireRoles('RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'),
  auditController.getUtilization.bind(auditController)
);

auditRouter.get(
  '/analytics/chargebacks',
  requireRoles('LAB_MANAGER', 'ADMIN'),
  auditController.getChargebacks.bind(auditController)
);
