import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuditLog, IAuditLogDocument } from './audit.model';

export interface LogEventParams {
  action: string;
  actorId: string;
  actorRole?: string;
  entityType: string;
  entityId: string;
  bookingId?: string | mongoose.Types.ObjectId;
  resourceId?: string | mongoose.Types.ObjectId;
  fromState?: string;
  toState?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface ChainVerificationResult {
  verified: boolean;
  totalRecordsVerified: number;
  lastBlockHash?: string;
  genesisHash?: string;
  tamperedSequence?: number;
  expectedHash?: string;
  foundHash?: string;
  reason?: string;
}

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  bookingId?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export function canonicalJson(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (obj instanceof Date) return JSON.stringify(obj.toISOString());
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',') + '}';
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

export class AuditService {
  public static readonly GENESIS_PREVIOUS_HASH = '0'.repeat(64);

  async logEvent(params: LogEventParams): Promise<IAuditLogDocument> {
    const timestamp = params.timestamp || new Date();
    const timestampIso = timestamp.toISOString();
    const eventId = crypto.randomUUID();

    const latestBlock = await AuditLog.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = latestBlock ? latestBlock.sequenceNumber + 1 : 1;
    const previousHash = latestBlock
      ? (latestBlock.currentHash || latestBlock.hash || AuditService.GENESIS_PREVIOUS_HASH)
      : AuditService.GENESIS_PREVIOUS_HASH;

    const metadata = JSON.parse(JSON.stringify(params.metadata || {}));
    const canonicalPayload = canonicalJson(metadata);
    const payloadHash = sha256(canonicalPayload);

    const hashPreimage = `${previousHash}${params.action}${params.actorId}${timestampIso}${payloadHash}`;
    const currentHash = sha256(hashPreimage);

    const auditEntry = new AuditLog({
      sequenceNumber,
      eventId,
      timestamp,
      action: params.action,
      actorId: params.actorId,
      actorRole: params.actorRole || 'SYSTEM',
      entityType: params.entityType,
      entityId: params.entityId,
      bookingId: params.bookingId ? new mongoose.Types.ObjectId(params.bookingId) : undefined,
      resourceId: params.resourceId ? new mongoose.Types.ObjectId(params.resourceId) : undefined,
      fromState: params.fromState,
      toState: params.toState,
      payloadHash,
      previousHash,
      currentHash,
      hash: currentHash,
      metadata,
    });

    return await auditEntry.save();
  }

  async verifyAuditChain(): Promise<ChainVerificationResult> {
    const logs = await AuditLog.find().sort({ sequenceNumber: 1 });

    if (logs.length === 0) {
      return {
        verified: true,
        totalRecordsVerified: 0,
        lastBlockHash: undefined,
        genesisHash: undefined,
      };
    }

    let previousHash = AuditService.GENESIS_PREVIOUS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const expectedSequence = i + 1;

      if (log.sequenceNumber !== expectedSequence) {
        return {
          verified: false,
          totalRecordsVerified: i,
          tamperedSequence: log.sequenceNumber,
          expectedHash: `sequenceNumber: ${expectedSequence}`,
          foundHash: `sequenceNumber: ${log.sequenceNumber}`,
          reason: `Broken sequence order: expected ${expectedSequence}, found ${log.sequenceNumber}`,
        };
      }

      if (log.previousHash !== previousHash) {
        return {
          verified: false,
          totalRecordsVerified: i,
          tamperedSequence: log.sequenceNumber,
          expectedHash: previousHash,
          foundHash: log.previousHash,
          reason: `Previous hash mismatch at sequence ${log.sequenceNumber}. Preceding chain broken.`,
        };
      }

      const canonicalPayload = canonicalJson(log.metadata || {});
      const expectedPayloadHash = sha256(canonicalPayload);
      if (log.payloadHash !== expectedPayloadHash) {
        return {
          verified: false,
          totalRecordsVerified: i,
          tamperedSequence: log.sequenceNumber,
          expectedHash: expectedPayloadHash,
          foundHash: log.payloadHash,
          reason: `Payload tampering detected: metadata hash mismatch at sequence ${log.sequenceNumber}.`,
        };
      }

      const timestampIso = new Date(log.timestamp).toISOString();
      const hashPreimage = `${log.previousHash}${log.action}${log.actorId}${timestampIso}${log.payloadHash}`;
      const expectedCurrentHash = sha256(hashPreimage);

      if (log.currentHash !== expectedCurrentHash && log.hash !== expectedCurrentHash) {
        return {
          verified: false,
          totalRecordsVerified: i,
          tamperedSequence: log.sequenceNumber,
          expectedHash: expectedCurrentHash,
          foundHash: log.currentHash || log.hash,
          reason: `Current hash mismatch at sequence ${log.sequenceNumber}. Document content was modified.`,
        };
      }

      previousHash = log.currentHash || log.hash!;
    }

    const tip = logs[logs.length - 1];
    return {
      verified: true,
      totalRecordsVerified: logs.length,
      lastBlockHash: tip.currentHash || tip.hash,
      genesisHash: logs[0].currentHash || logs[0].hash,
    };
  }

  async getLogs(filter: AuditLogFilter = {}) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (filter.entityType) query.entityType = filter.entityType.toUpperCase();
    if (filter.entityId) query.entityId = filter.entityId;
    if (filter.actorId) query.actorId = filter.actorId;
    if (filter.action) query.action = filter.action;
    if (filter.bookingId) query.bookingId = new mongoose.Types.ObjectId(filter.bookingId);
    if (filter.resourceId) query.resourceId = new mongoose.Types.ObjectId(filter.resourceId);

    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = new Date(filter.startDate);
      if (filter.endDate) query.timestamp.$lte = new Date(filter.endDate);
    }

    const [events, total] = await Promise.all([
      AuditLog.find(query).sort({ sequenceNumber: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUtilizationAnalytics() {
    const completedSessions = await AuditLog.find({ action: 'BOOKING_RETURNED' });

    let totalMachineHours = 0;
    let incidentCount = 0;
    const resourceUsageMap: Record<string, number> = {};

    for (const session of completedSessions) {
      const runtime = session.metadata?.deltaMeter?.runTimeSeconds
        ? session.metadata.deltaMeter.runTimeSeconds / 3600
        : session.metadata?.durationHours || 2;

      totalMachineHours += runtime;

      const rId = session.resourceId ? session.resourceId.toString() : 'unknown';
      resourceUsageMap[rId] = (resourceUsageMap[rId] || 0) + runtime;

      if (session.metadata?.incidentCreated) {
        incidentCount++;
      }
    }

    const totalSessions = completedSessions.length;
    const uptimePct = totalSessions > 0 ? Math.round(((totalSessions - incidentCount) / totalSessions) * 100) : 100;

    return {
      totalSessions,
      totalMachineHours: Number(totalMachineHours.toFixed(2)),
      averageSessionHours: totalSessions > 0 ? Number((totalMachineHours / totalSessions).toFixed(2)) : 0,
      uptimePercentage: uptimePct,
      incidentsReported: incidentCount,
      resourceUtilizationHours: resourceUsageMap,
      calculatedAt: new Date().toISOString(),
    };
  }

  async getChargebacksAnalytics() {
    const billingLogs = await AuditLog.find({
      action: { $in: ['BOOKING_RETURNED', 'INCIDENT_ADJUDICATED', 'BOOKING_APPROVED'] },
    });

    const grantMap: Record<string, { totalHours: number; totalCost: number; bookingsCount: number }> = {};

    for (const log of billingLogs) {
      const grant = log.metadata?.projectGrantCode || log.metadata?.grantCodeCharged || 'GENERAL_DEPARTMENTAL';
      if (!grantMap[grant]) {
        grantMap[grant] = { totalHours: 0, totalCost: 0, bookingsCount: 0 };
      }

      const hours = log.metadata?.durationHours || 2;
      const rate = log.metadata?.hourlyRate || 50;
      const charge = log.metadata?.billingChargeAmount || hours * rate;

      grantMap[grant].totalHours += hours;
      grantMap[grant].totalCost += charge;
      grantMap[grant].bookingsCount += 1;
    }

    return {
      grants: Object.entries(grantMap).map(([grantCode, stats]) => ({
        grantCode,
        totalHours: Number(stats.totalHours.toFixed(2)),
        totalCost: Number(stats.totalCost.toFixed(2)),
        bookingsCount: stats.bookingsCount,
      })),
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const auditService = new AuditService();
