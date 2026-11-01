import mongoose from 'mongoose';
import { User, IUserDocument, UserRole } from '../auth/user.model';
import { Booking, IBookingDocument } from '../bookings/booking.model';
import { ForbiddenError, NotFoundError } from '../../middleware/error.middleware';

export const ROLE_WEEKLY_QUOTAS: Record<UserRole, number> = {
  STUDENT: 10,
  RESEARCHER: 25,
  RESOURCE_OWNER: 40,
  LAB_MANAGER: 40,
  ADMIN: 100,
};

export const FAIRNESS_WEIGHTS = {
  W_hist: 0.35,
  W_can: 0.20,
  W_rep: 0.25,
  W_wait: 0.20,
} as const;

export interface FairnessScoreBreakdown {
  score: number; 
  components: {
    S_hist: number;
    S_can: number;
    S_rep: number;
    S_wait: number;
  };
  weights: {
    W_hist: number;
    W_can: number;
    W_rep: number;
    W_wait: number;
  };
  metadata: {
    weeklyHoursUsed: number;
    weeklyQuotaLimit: number;
    trustScore: number;
    reputationScore: number;
    noShowCount: number;
    lateCancellationCount: number;
    queueTenureHours: number;
  };
}

export interface QuotaCheckResult {
  allowed: boolean;
  role: UserRole;
  weeklyQuotaLimitHours: number;
  weeklyQuotaUsedHours: number;
  requestedHours: number;
  remainingHours: number;
  exceededByHours?: number;
}

export class FairnessService {
  public getWeekInterval(targetDate: Date = new Date()): { startOfWeek: Date; endOfWeek: Date } {
    const d = new Date(targetDate);
    const day = d.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const startOfWeek = new Date(d);
    startOfWeek.setUTCDate(d.getUTCDate() + diffToMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  public async getWeeklyHoursUsed(
    userId: string | mongoose.Types.ObjectId,
    targetDate: Date = new Date(),
    excludeBookingId?: string | mongoose.Types.ObjectId
  ): Promise<number> {
    const { startOfWeek, endOfWeek } = this.getWeekInterval(targetDate);
    const uId = new mongoose.Types.ObjectId(userId);

    const query: any = {
      userId: uId,
      status: {
        $in: [
          'APPROVED',
          'CHECKED_IN',
          'IN_USE',
          'AWAITING_APPROVAL',
          'PENDING_REVIEW',
          'OFFERED',
          'COMPLETED',
        ],
      },
      startTime: { $gte: startOfWeek, $lte: endOfWeek },
    };

    if (excludeBookingId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }

    const bookings: IBookingDocument[] = await Booking.find(query).select('durationMinutes startTime endTime');

    const totalMinutes = bookings.reduce((acc, b) => {
      if (b.durationMinutes && b.durationMinutes > 0) {
        return acc + b.durationMinutes;
      }
      const diffMs = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      return acc + Math.round(diffMs / (60 * 1000));
    }, 0);

    return Number((totalMinutes / 60).toFixed(2));
  }

  public getUserWeeklyQuotaLimit(user: IUserDocument, resourceId?: string): number {
    if (resourceId && user.weeklyQuotaOverrides && typeof user.weeklyQuotaOverrides.get === 'function') {
      const override = user.weeklyQuotaOverrides.get(resourceId);
      if (typeof override === 'number') return override;
    }

    if (typeof user.weeklyQuotaLimitHours === 'number' && user.weeklyQuotaLimitHours > 0) {
      return user.weeklyQuotaLimitHours;
    }

    return ROLE_WEEKLY_QUOTAS[user.role] ?? 10;
  }

  public async verifyQuota(
    userId: string | mongoose.Types.ObjectId,
    requestedStart: Date,
    requestedDurationHours: number,
    resourceId?: string,
    excludeBookingId?: string | mongoose.Types.ObjectId
  ): Promise<QuotaCheckResult> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError(`User ${userId} not found`, 'USER_NOT_FOUND');
    }

    if (user.role === 'ADMIN') {
      return {
        allowed: true,
        role: user.role,
        weeklyQuotaLimitHours: 100,
        weeklyQuotaUsedHours: 0,
        requestedHours: requestedDurationHours,
        remainingHours: 100,
      };
    }

    const limitHours = this.getUserWeeklyQuotaLimit(user, resourceId);
    const usedHours = await this.getWeeklyHoursUsed(userId, requestedStart, excludeBookingId);
    const newTotal = Number((usedHours + requestedDurationHours).toFixed(2));
    const remaining = Number(Math.max(0, limitHours - usedHours).toFixed(2));

    if (newTotal > limitHours) {
      const exceededBy = Number((newTotal - limitHours).toFixed(2));
      throw new ForbiddenError(
        `Weekly usage quota exceeded. Allowed: ${limitHours}h/week, Currently Booked: ${usedHours}h, Requested: ${requestedDurationHours}h. Exceeded by: ${exceededBy}h.`,
        'QUOTA_EXCEEDED'
      );
    }

    return {
      allowed: true,
      role: user.role,
      weeklyQuotaLimitHours: limitHours,
      weeklyQuotaUsedHours: usedHours,
      requestedHours: requestedDurationHours,
      remainingHours: remaining,
    };
  }

  public async verifyCooldown(
    userId: string | mongoose.Types.ObjectId,
    resourceId: string | mongoose.Types.ObjectId,
    requestedStart: Date,
    cooldownMinutes: number = 120,
    excludeBookingId?: string | mongoose.Types.ObjectId
  ): Promise<{ cooldownActive: boolean; waivedByImminentIdle: boolean; waitMinutesRemaining?: number }> {
    const now = Date.now();
    const startMs = requestedStart.getTime();

    const timeUntilStartMinutes = (startMs - now) / (60 * 1000);
    if (timeUntilStartMinutes >= 0 && timeUntilStartMinutes < 120) {
      return {
        cooldownActive: false,
        waivedByImminentIdle: true,
      };
    }

    const effectiveCooldownMins = Math.max(120, cooldownMinutes);
    const cooldownMs = effectiveCooldownMins * 60 * 1000;

    const uId = new mongoose.Types.ObjectId(userId);
    const rId = new mongoose.Types.ObjectId(resourceId);

    const priorQuery: any = {
      userId: uId,
      resourceId: rId,
      status: { $in: ['APPROVED', 'CHECKED_IN', 'IN_USE', 'COMPLETED', 'RETURNED'] },
      endTime: { $lte: requestedStart },
    };

    if (excludeBookingId) {
      priorQuery._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }

    const lastBooking = await Booking.findOne(priorQuery).sort({ endTime: -1 });

    if (!lastBooking) {
      return { cooldownActive: false, waivedByImminentIdle: false };
    }

    const lastEndMs = new Date(lastBooking.endTime).getTime();
    const elapsedMs = startMs - lastEndMs;

    if (elapsedMs < cooldownMs) {
      const waitMinutesRemaining = Math.ceil((cooldownMs - elapsedMs) / (60 * 1000));
      throw new ForbiddenError(
        `Anti-hoarding cooldown active: A minimum ${effectiveCooldownMins} minute buffer is enforced between consecutive sessions on this instrument. Please wait another ${waitMinutesRemaining} minutes before your next booking.`,
        'COOLDOWN_ACTIVE'
      );
    }

    return { cooldownActive: false, waivedByImminentIdle: false };
  }

  public async calculateFairnessScore(
    userId: string | mongoose.Types.ObjectId,
    options?: {
      targetDate?: Date;
      queuedAt?: Date;
      resourceId?: string;
    }
  ): Promise<FairnessScoreBreakdown> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError(`User ${userId} not found`, 'USER_NOT_FOUND');
    }

    const targetDate = options?.targetDate || new Date();
    const queuedAt = options?.queuedAt;

    const limitHours = this.getUserWeeklyQuotaLimit(user, options?.resourceId);
    const usedHours = await this.getWeeklyHoursUsed(userId, targetDate);
    const usageRatio = limitHours > 0 ? usedHours / limitHours : 0;
    const S_hist = Math.max(0, Math.min(100, Number((100 - usageRatio * 100).toFixed(2))));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pastBookings = await Booking.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: thirtyDaysAgo },
      status: { $in: ['NO_SHOW', 'CANCELLED'] },
    });

    const noShowCount = pastBookings.filter((b) => b.status === 'NO_SHOW').length;
    const lateCancellationCount = pastBookings.filter((b) => {
      if (b.status !== 'CANCELLED' || !b.cancelledAt) return false;
      const hoursBefore = (new Date(b.startTime).getTime() - new Date(b.cancelledAt).getTime()) / (60 * 60 * 1000);
      return hoursBefore < 2;
    }).length;

    const penaltyPoints = lateCancellationCount * 15.0 + noShowCount * 35.0;
    const S_can = Math.max(0, Number((100.0 - penaltyPoints).toFixed(2)));

    const rawRep = typeof user.reputationScore === 'number' ? user.reputationScore : user.trustScore || 80;
    const S_rep = Math.max(0, Math.min(100, Number(rawRep.toFixed(2))));

    let queueTenureHours = 0;
    let S_wait = 0;
    if (queuedAt) {
      queueTenureHours = Math.max(0, (Date.now() - new Date(queuedAt).getTime()) / (60 * 60 * 1000));
      S_wait = Math.min(100, Number(((queueTenureHours / 72.0) * 100).toFixed(2)));
    }

    const rawF =
      FAIRNESS_WEIGHTS.W_hist * S_hist +
      FAIRNESS_WEIGHTS.W_can * S_can +
      FAIRNESS_WEIGHTS.W_rep * S_rep +
      FAIRNESS_WEIGHTS.W_wait * S_wait;

    const finalF = Number(Math.max(0, Math.min(100, rawF)).toFixed(2));

    return {
      score: finalF,
      components: {
        S_hist,
        S_can,
        S_rep,
        S_wait,
      },
      weights: {
        W_hist: FAIRNESS_WEIGHTS.W_hist,
        W_can: FAIRNESS_WEIGHTS.W_can,
        W_rep: FAIRNESS_WEIGHTS.W_rep,
        W_wait: FAIRNESS_WEIGHTS.W_wait,
      },
      metadata: {
        weeklyHoursUsed: usedHours,
        weeklyQuotaLimit: limitHours,
        trustScore: user.trustScore || 85,
        reputationScore: user.reputationScore || 80,
        noShowCount,
        lateCancellationCount,
        queueTenureHours: Number(queueTenureHours.toFixed(2)),
      },
    };
  }
}

export const fairnessService = new FairnessService();
export default fairnessService;
