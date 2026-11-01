import { Router, Request, Response, NextFunction } from 'express';
import { fairnessService } from './fairness.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { UnauthorizedError } from '../../middleware/error.middleware';

export const fairnessRouter: Router = Router();

fairnessRouter.get('/score', authenticateUser, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required to calculate fairness score', 'AUTH_TOKEN_MISSING');
    }

    const resourceId = req.query.resourceId as string | undefined;
    const scoreBreakdown = await fairnessService.calculateFairnessScore(req.user.id, {
      resourceId,
    });

    res.status(200).json({
      success: true,
      data: scoreBreakdown,
    });
  } catch (err) {
    next(err);
  }
});

fairnessRouter.get('/quota', authenticateUser, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_TOKEN_MISSING');
    }

    const targetDate = req.query.targetDate ? new Date(req.query.targetDate as string) : new Date();
    const resourceId = req.query.resourceId as string | undefined;

    const usedHours = await fairnessService.getWeeklyHoursUsed(req.user.id, targetDate);
    const scoreBreakdown = await fairnessService.calculateFairnessScore(req.user.id, { resourceId, targetDate });
    const limitHours = scoreBreakdown.metadata.weeklyQuotaLimit;
    const remainingHours = Number(Math.max(0, limitHours - usedHours).toFixed(2));

    const { startOfWeek, endOfWeek } = fairnessService.getWeekInterval(targetDate);

    res.status(200).json({
      success: true,
      data: {
        role: req.user.role,
        weeklyQuotaLimitHours: limitHours,
        weeklyQuotaUsedHours: usedHours,
        remainingHours,
        weekInterval: {
          startOfWeek,
          endOfWeek,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default fairnessRouter;
