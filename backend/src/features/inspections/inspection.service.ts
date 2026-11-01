import mongoose from 'mongoose';
import { Inspection, IInspectionDocument, ConditionRating, CONDITION_SCORES, IConditionDiff } from './inspection.model';
import { Incident } from '../incidents/incident.model';
import { auditService, sha256, canonicalJson } from '../audit/audit.service';
import { AuthenticatedUser } from '../../middleware/auth.middleware';
import { BadRequestError, NotFoundError, UnprocessableEntityError } from '../../middleware/error.middleware';
import { emitToBooking, emitToManagers, SOCKET_EVENTS } from '../../real-time/socket';
import { CheckInInspectionDTO, ReturnInspectionDTO } from './inspection.validation';

export class InspectionService {
  async checkIn(dto: CheckInInspectionDTO, inspector: AuthenticatedUser) {
    const bookingId = dto.bookingId;

    let bookingDoc: any = null;
    if (mongoose.models.Booking) {
      bookingDoc = await mongoose.model('Booking').findById(bookingId);
    }
    if (!bookingDoc) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    const existingCheckIn = await Inspection.findCheckIn(bookingId);
    if (existingCheckIn) {
      throw new BadRequestError(`Check-in inspection already recorded for booking '${bookingId}'`);
    }

    if (process.env.STRICT_CHECKIN_WINDOW === 'true' && bookingDoc.startTime) {
      const now = Date.now();
      const startMs = new Date(bookingDoc.startTime).getTime();
      const minWindowMs = startMs - 15 * 60 * 1000;
      const maxWindowMs = startMs + 30 * 60 * 1000;

      if (now < minWindowMs) {
        throw new BadRequestError('Check-in window opens 15 minutes prior to scheduled start time');
      }
      if (now > maxWindowMs) {
        throw new BadRequestError('Check-in window closed 30 minutes after scheduled start time (session marked no-show)');
      }
    }

    if (dto.checklistResponses && dto.checklistResponses.length > 0) {
      const failedCritical = dto.checklistResponses.find((item) => item.isCritical && !item.verified);
      if (failedCritical) {
        throw new BadRequestError(
          `Pre-use check failed: Critical safety checklist item '${failedCritical.itemText || failedCritical.itemId}' must be verified to unlock access.`
        );
      }
    }

    const signedAt = dto.digitalSignature?.signedAt ? new Date(dto.digitalSignature.signedAt) : new Date();
    const signatureHash =
      dto.digitalSignature?.signatureHash ||
      sha256(`${inspector.id}:${signedAt.toISOString()}:${canonicalJson(dto.meterReadings)}`);

    const photos = dto.photos && dto.photos.length > 0 ? dto.photos : dto.photoUploads || [];
    const conditionRating = (dto.conditionRating || dto.initialConditionRating) as ConditionRating;

    const checkInInspection = new Inspection({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      resourceId: bookingDoc.resourceId,
      inspectorId: new mongoose.Types.ObjectId(inspector.id),
      inspectorRole: dto.inspectorRole || inspector.role,
      type: 'CHECK_IN',
      phase: 'CHECK_IN',
      conditionRating,
      checklistResponses: dto.checklistResponses,
      meterReadings: dto.meterReadings,
      photos,
      photoUploads: photos,
      preExistingDamageNotes: dto.preExistingDamageNotes,
      notes: dto.notes,
      digitalSignature: {
        signedBy: new mongoose.Types.ObjectId(inspector.id),
        signerName: inspector.name,
        signedAt,
        signatureHash,
      },
    });

    const savedInspection = await checkInInspection.save();

    const accessPin = bookingDoc.accessPin || Math.floor(1000 + Math.random() * 9000).toString();
    const sessionStartTime = new Date();

    bookingDoc.status = 'CHECKED_IN';
    bookingDoc.checkInTime = sessionStartTime;
    bookingDoc.accessPin = accessPin;
    await bookingDoc.save();

    await auditService.logEvent({
      action: 'BOOKING_CHECKED_IN',
      actorId: inspector.id,
      actorRole: inspector.role,
      entityType: 'BOOKING',
      entityId: bookingId,
      bookingId,
      resourceId: bookingDoc.resourceId,
      fromState: 'APPROVED',
      toState: 'CHECKED_IN',
      metadata: {
        inspectionId: savedInspection._id.toString(),
        initialConditionRating: conditionRating,
        baselineMeters: dto.meterReadings,
        preExistingNotes: dto.preExistingDamageNotes,
      },
    });

    emitToBooking(bookingId, SOCKET_EVENTS.BOOKING_CHECKED_IN, {
      bookingId,
      checkInTime: sessionStartTime,
      initialRating: conditionRating,
      baselineMeter: dto.meterReadings,
      inspector: inspector.name,
    });

    return {
      success: true,
      status: 'CHECKED_IN',
      accessPin,
      sessionStartTime,
      inspection: savedInspection,
      initialInspection: savedInspection,
    };
  }

  async returnResource(dto: ReturnInspectionDTO, inspector: AuthenticatedUser) {
    const bookingId = dto.bookingId;

    let bookingDoc: any = null;
    if (mongoose.models.Booking) {
      bookingDoc = await mongoose.model('Booking').findById(bookingId);
    }
    if (!bookingDoc) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    const checkIn = await Inspection.findCheckIn(bookingId);
    if (!checkIn) {
      throw new BadRequestError(
        `Cannot execute return: No baseline check-in inspection found for booking '${bookingId}'.`
      );
    }

    const rawCheckInMeters = checkIn.meterReadings;
    const checkInMeters: Record<string, number> =
      rawCheckInMeters instanceof Map
        ? Object.fromEntries(rawCheckInMeters)
        : (rawCheckInMeters as any) || {};

    const returnMeters = dto.finalMeterReadings || dto.meterReadings || {};
    const meterDeltas: Record<string, number> = {};

    for (const [meterKey, returnVal] of Object.entries(returnMeters)) {
      const checkInVal = checkInMeters[meterKey] !== undefined ? checkInMeters[meterKey] : returnVal;
      const delta = Number(returnVal) - Number(checkInVal);

      if (delta < 0) {
        throw new UnprocessableEntityError(
          `Counter rollback error: Final meter reading (${returnVal}) for '${meterKey}' cannot be lower than baseline check-in reading (${checkInVal}).`,
          'METER_ROLLBACK_ERROR'
        );
      }

      meterDeltas[meterKey] = Number(delta.toFixed(4));
    }

    const finalRating = (dto.finalConditionRating || dto.conditionRating) as ConditionRating;
    const initialRating = checkIn.conditionRating as ConditionRating;

    const returnScore = CONDITION_SCORES[finalRating] ?? 2;
    const checkInScore = CONDITION_SCORES[initialRating] ?? 4;
    const ratingDelta = returnScore - checkInScore;

    const conditionDroppedBelowFair = returnScore < CONDITION_SCORES.FAIR;
    const isDamaged = finalRating === 'DAMAGED';
    const severeDrop = ratingDelta <= -2;
    const flaggedAnomaly = conditionDroppedBelowFair || isDamaged || severeDrop;

    let anomalyDetails: string | undefined;
    let incidentCreated = false;
    let createdIncidentDoc: any = null;

    if (flaggedAnomaly) {
      anomalyDetails = `Condition rating degraded from ${initialRating} to ${finalRating} (score delta: ${ratingDelta}). Instrument flagged for review.`;
    }

    if (flaggedAnomaly) {
      const incidentNumber = await (Incident as any).generateIncidentNumber();
      const description = `Automatic incident ticket generated upon return inspection: Condition rating dropped from ${initialRating} to ${finalRating} (ratingDelta: ${ratingDelta}). Meter usage: ${JSON.stringify(meterDeltas)}. Notes: ${dto.returnNotes || dto.notes || 'None'}`;

      const newIncident = new Incident({
        incidentNumber,
        bookingId: new mongoose.Types.ObjectId(bookingId),
        resourceId: bookingDoc.resourceId,
        reportedBy: new mongoose.Types.ObjectId(inspector.id),
        accusedParty: bookingDoc.userId,
        category: 'PHYSICAL_DAMAGE',
        severity: isDamaged ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        description,
        repairCostEstimate: isDamaged ? 1000 : 250,
        evidencePhotos: (dto.photos || dto.photoUploads || []).map((p) => ({
          photoUrl: p.photoUrl,
          sha256Hash: p.sha256Hash,
          caption: p.caption,
        })),
      });

      createdIncidentDoc = await newIncident.save();
      incidentCreated = true;

      bookingDoc.status = 'DISPUTED';

      emitToManagers(SOCKET_EVENTS.INCIDENT_CREATED, {
        incidentId: createdIncidentDoc._id.toString(),
        incidentNumber,
        bookingId,
        category: 'PHYSICAL_DAMAGE',
        severity: isDamaged ? 'CRITICAL' : 'HIGH',
        description,
      });
    } else {
      bookingDoc.status = 'COMPLETED';
    }

    const returnTime = new Date();
    bookingDoc.returnTime = returnTime;
    await bookingDoc.save();

    const signedAt = dto.digitalSignature?.signedAt ? new Date(dto.digitalSignature.signedAt) : new Date();
    const signatureHash =
      dto.digitalSignature?.signatureHash ||
      sha256(`${inspector.id}:${signedAt.toISOString()}:${canonicalJson(returnMeters)}`);

    const conditionDiff: IConditionDiff = {
      initialRating,
      finalRating,
      ratingDelta,
      meterDeltas,
      flaggedAnomaly,
      anomalyDetails,
      incidentCreated,
      incidentId: createdIncidentDoc?._id,
    };

    const photos = dto.photos && dto.photos.length > 0 ? dto.photos : dto.photoUploads || [];

    const returnInspection = new Inspection({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      resourceId: bookingDoc.resourceId,
      inspectorId: new mongoose.Types.ObjectId(inspector.id),
      inspectorRole: dto.inspectorRole || inspector.role,
      type: 'RETURN',
      phase: 'RETURN',
      conditionRating: finalRating,
      checklistResponses: dto.checklistResponses,
      meterReadings: returnMeters,
      photos,
      photoUploads: photos,
      notes: dto.returnNotes || dto.notes,
      conditionDiff,
      digitalSignature: {
        signedBy: new mongoose.Types.ObjectId(inspector.id),
        signerName: inspector.name,
        signedAt,
        signatureHash,
      },
    });

    const savedReturn = await returnInspection.save();

    await auditService.logEvent({
      action: 'BOOKING_RETURNED',
      actorId: inspector.id,
      actorRole: inspector.role,
      entityType: 'BOOKING',
      entityId: bookingId,
      bookingId,
      resourceId: bookingDoc.resourceId,
      fromState: 'CHECKED_IN',
      toState: bookingDoc.status,
      metadata: {
        returnInspectionId: savedReturn._id.toString(),
        finalConditionRating: finalRating,
        ratingDelta,
        deltaMeter: meterDeltas,
        flaggedAnomaly,
        incidentCreated,
        incidentId: createdIncidentDoc?._id?.toString(),
      },
    });

    emitToBooking(bookingId, SOCKET_EVENTS.BOOKING_RETURNED, {
      bookingId,
      returnTime,
      meterDelta: meterDeltas,
      conditionDiff,
      flagged: flaggedAnomaly,
      bookingStatus: bookingDoc.status,
    });

    return {
      success: true,
      bookingStatus: bookingDoc.status,
      sessionSummary: {
        bookingId,
        returnTime,
        status: bookingDoc.status,
        meterDeltas,
        ratingDelta,
        flaggedAnomaly,
      },
      diff: conditionDiff,
      initialInspection: checkIn,
      finalInspection: savedReturn,
      inspection: savedReturn,
      incident: createdIncidentDoc,
    };
  }

  async getByBookingId(bookingId: string) {
    const [initialInspection, finalInspection] = await Promise.all([
      Inspection.findCheckIn(bookingId),
      Inspection.findReturn(bookingId),
    ]);

    return {
      initialInspection,
      finalInspection,
      diff: finalInspection?.conditionDiff || null,
    };
  }
}

export const inspectionService = new InspectionService();
