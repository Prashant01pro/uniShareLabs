import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { ForbiddenError } from '../../middleware/error.middleware';

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const { entityType, entityId, actorId, action, bookingId, resourceId, startDate, endDate, page, limit } =
        req.query;

      const filter: any = {
        entityType: entityType as string,
        entityId: entityId as string,
        actorId: actorId as string,
        action: action as string,
        bookingId: bookingId as string,
        resourceId: resourceId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      };

      if (user && (user.role === 'STUDENT' || user.role === 'RESEARCHER')) {
        filter.actorId = user.id;
      }

      const result = await auditService.getLogs(filter);

      res.status(200).json({
        success: true,
        data: result.events,
        events: result.events, 
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyChain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await auditService.verifyAuditChain();

      if (!result.verified) {
        res.status(409).json({
          success: false,
          verified: false,
          tamperedSequence: result.tamperedSequence,
          expectedHash: result.expectedHash,
          foundHash: result.foundHash,
          reason: result.reason,
          message: 'AUDIT_INTEGRITY_COMPROMISED: Ledger hash chain verification failed.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        verified: true,
        totalRecordsVerified: result.totalRecordsVerified,
        lastBlockHash: result.lastBlockHash,
        genesisHash: result.genesisHash,
        message: 'Audit ledger cryptographic chain successfully verified from genesis.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getUtilization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await auditService.getUtilizationAnalytics();
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }

  async getChargebacks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await auditService.getChargebacksAnalytics();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
