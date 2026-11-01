import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Incident } from './incident.model';
import { User } from '../auth/user.model';
import { auditService } from '../audit/audit.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../middleware/error.middleware';
import { emitToBooking, emitToManagers, emitToUser, SOCKET_EVENTS } from '../../real-time/socket';

export class IncidentController {
  async createIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const {
        bookingId,
        resourceId: customResourceId,
        category,
        severity,
        description,
        accusedParty: customAccusedParty,
        penaltyHours,
        repairCostEstimate,
        evidencePhotos,
      } = req.body;

      let bookingDoc: any = null;
      if (mongoose.models.Booking) {
        bookingDoc = await mongoose.model('Booking').findById(bookingId);
      }

      const resourceId = customResourceId || bookingDoc?.resourceId;
      if (!resourceId) {
        throw new BadRequestError('ResourceId is required or could not be determined from bookingId');
      }

      let accusedParty = customAccusedParty;
      if (!accusedParty && bookingDoc) {
        accusedParty = bookingDoc.userId?.toString() !== user.id ? bookingDoc.userId : undefined;
      }

      const incidentNumber = await (Incident as any).generateIncidentNumber();

      const incident = new Incident({
        incidentNumber,
        bookingId: new mongoose.Types.ObjectId(bookingId),
        resourceId: new mongoose.Types.ObjectId(resourceId),
        reportedBy: new mongoose.Types.ObjectId(user.id),
        accusedParty: accusedParty ? new mongoose.Types.ObjectId(accusedParty) : undefined,
        category,
        severity,
        status: 'OPEN',
        description,
        penaltyHours: penaltyHours || 0,
        repairCostEstimate: repairCostEstimate || 0,
        evidencePhotos: evidencePhotos || [],
      });

      const savedIncident = await incident.save();

      if (bookingDoc) {
        bookingDoc.status = 'DISPUTED';
        await bookingDoc.save();
      }

      await auditService.logEvent({
        action: 'INCIDENT_FILED',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'INCIDENT',
        entityId: savedIncident._id.toString(),
        bookingId,
        resourceId,
        metadata: {
          incidentNumber,
          category,
          severity,
          accusedParty: accusedParty?.toString(),
          repairCostEstimate,
        },
      });

      emitToBooking(bookingId, SOCKET_EVENTS.INCIDENT_CREATED, {
        incidentId: savedIncident._id.toString(),
        incidentNumber,
        bookingId,
        category,
        severity,
        description,
        reportedBy: user.name,
      });

      emitToManagers(SOCKET_EVENTS.INCIDENT_CREATED, {
        incidentId: savedIncident._id.toString(),
        incidentNumber,
        bookingId,
        category,
        severity,
        description,
      });

      res.status(201).json({
        success: true,
        data: savedIncident,
        incident: savedIncident,
        message: `Incident ticket ${incidentNumber} filed successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  async getIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { status, severity, category, bookingId, resourceId, accusedParty, page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const query: Record<string, any> = {};

      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (category) query.category = category;
      if (bookingId) query.bookingId = new mongoose.Types.ObjectId(bookingId as string);
      if (resourceId) query.resourceId = new mongoose.Types.ObjectId(resourceId as string);
      if (accusedParty) query.accusedParty = new mongoose.Types.ObjectId(accusedParty as string);

      if (user.role === 'STUDENT' || user.role === 'RESEARCHER') {
        query.$or = [
          { reportedBy: new mongoose.Types.ObjectId(user.id) },
          { accusedParty: new mongoose.Types.ObjectId(user.id) },
        ];
      }

      const [incidents, total] = await Promise.all([
        Incident.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('reportedBy', 'name email role department')
          .populate('accusedParty', 'name email role department trustScore')
          .populate('resourceId', 'name title code department category'),
        Incident.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: incidents,
        incidents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getIncidentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);

      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const query = isObjectId ? { _id: id } : { incidentNumber: id.toUpperCase().trim() };

      const incident = await Incident.findOne(query)
        .populate('reportedBy', 'name email role department')
        .populate('accusedParty', 'name email role department trustScore')
        .populate('resourceId', 'name title code department category')
        .populate('bookingId');

      if (!incident) {
        throw new NotFoundError(`Incident ticket '${id}' not found`);
      }

      res.status(200).json({
        success: true,
        data: incident,
        incident,
      });
    } catch (err) {
      next(err);
    }
  }

  async resolveIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = String(req.params.id);
      const {
        status = 'RESOLVED',
        managerNotes,
        resolutionOutcome,
        decision = 'SHARED_LIABILITY',
        penaltyPointsAssigned = 0,
        penaltyHours = 0,
        billingChargeAmount = 0,
        grantCodeCharged,
        actionItemsRequired = [],
        findingsSummary,
      } = req.body;

      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const query = isObjectId ? { _id: id } : { incidentNumber: id.toUpperCase().trim() };

      const incident = await Incident.findOne(query);
      if (!incident) {
        throw new NotFoundError(`Incident ticket '${id}' not found`);
      }

      incident.status = status;
      if (managerNotes) incident.managerNotes = managerNotes;
      if (resolutionOutcome) incident.resolutionOutcome = resolutionOutcome;
      if (penaltyHours > 0) incident.penaltyHours = penaltyHours;
      if (billingChargeAmount > 0) incident.repairCostEstimate = billingChargeAmount;

      incident.adjudication = {
        adjudicatedBy: new mongoose.Types.ObjectId(user.id),
        adjudicatedAt: new Date(),
        decision,
        penaltyPointsAssigned,
        penaltyHours,
        billingChargeAmount,
        grantCodeCharged,
        actionItemsRequired,
        findingsSummary: findingsSummary || resolutionOutcome || managerNotes || 'Incident adjudicated by manager.',
      };

      await incident.save();

      if (incident.accusedParty && penaltyPointsAssigned > 0) {
        const accusedUser = await User.findById(incident.accusedParty);
        if (accusedUser) {
          const oldScore = accusedUser.trustScore;
          accusedUser.trustScore = Math.max(0, accusedUser.trustScore - penaltyPointsAssigned);
          accusedUser.activePenaltyPoints = (accusedUser.activePenaltyPoints || 0) + penaltyPointsAssigned;
          await accusedUser.save();

          emitToUser(incident.accusedParty.toString(), SOCKET_EVENTS.TRUST_SCORE_UPDATED, {
            userId: incident.accusedParty.toString(),
            previousScore: oldScore,
            newScore: accusedUser.trustScore,
            delta: -penaltyPointsAssigned,
            reason: `Incident ${incident.incidentNumber} penalty assessment`,
          });
        }
      }

      if (mongoose.models.Booking && incident.bookingId) {
        const booking = await mongoose.model('Booking').findById(incident.bookingId);
        if (booking) {
          booking.status = 'RESOLVED';
          await booking.save();
        }
      }

      await auditService.logEvent({
        action: 'INCIDENT_ADJUDICATED',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'INCIDENT',
        entityId: incident._id.toString(),
        bookingId: incident.bookingId,
        resourceId: incident.resourceId,
        metadata: {
          incidentNumber: incident.incidentNumber,
          decision,
          penaltyPointsAssigned,
          billingChargeAmount,
          grantCodeCharged,
        },
      });

      res.status(200).json({
        success: true,
        data: incident,
        incident,
        message: `Incident ticket ${incident.incidentNumber} adjudicated and resolved successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  async disputeIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = String(req.params.id);
      const { disputeStatement, disputeDetails, evidencePhotos } = req.body;

      const statement = disputeStatement || disputeDetails;

      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const query = isObjectId ? { _id: id } : { incidentNumber: id.toUpperCase().trim() };

      const incident = await Incident.findOne(query);
      if (!incident) {
        throw new NotFoundError(`Incident ticket '${id}' not found`);
      }

      if (
        user.role !== 'ADMIN' &&
        user.role !== 'LAB_MANAGER' &&
        incident.accusedParty &&
        incident.accusedParty.toString() !== user.id
      ) {
        throw new ForbiddenError('Only the accused party or lab manager can submit dispute statements');
      }

      incident.disputeStatement = statement;
      incident.disputeDetails = statement;
      incident.disputedAt = new Date();
      incident.status = 'INVESTIGATING';

      if (evidencePhotos && Array.isArray(evidencePhotos)) {
        incident.evidencePhotos.push(...evidencePhotos);
      }

      await incident.save();

      await auditService.logEvent({
        action: 'INCIDENT_DISPUTED',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'INCIDENT',
        entityId: incident._id.toString(),
        bookingId: incident.bookingId,
        resourceId: incident.resourceId,
        metadata: {
          incidentNumber: incident.incidentNumber,
          statementSnippet: statement?.substring(0, 100),
        },
      });

      res.status(200).json({
        success: true,
        data: incident,
        incident,
        message: `Dispute statement recorded for incident ${incident.incidentNumber}.`,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const incidentController = new IncidentController();
