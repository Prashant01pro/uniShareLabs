import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const evidencePhotoSchema = z.object({
  photoUrl: z.string().min(1, 'Photo URL is required'),
  sha256Hash: z.string().default('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
  caption: z.string().max(500).optional(),
});

export const createIncidentSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format'),
  resourceId: z.string().regex(objectIdRegex, 'Invalid resourceId format').optional(),
  category: z.enum([
    'LATE_RETURN',
    'PHYSICAL_DAMAGE',
    'UNAUTHORIZED_ACCESS',
    'MISSING_PARTS',
    'SAFETY_BREACH',
    'EQUIPMENT_DAMAGE',
    'MISSING_ACCESSORY',
    'SAFETY_VIOLATION',
    'ENVIRONMENTAL_SPILL',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(5, 'Description must be at least 5 characters').max(4000),
  accusedParty: z.string().regex(objectIdRegex, 'Invalid accusedParty format').optional(),
  penaltyHours: z.number().min(0).default(0).optional(),
  repairCostEstimate: z.number().min(0).default(0).optional(),
  evidencePhotos: z.array(evidencePhotoSchema).default([]).optional(),
});

export const resolveIncidentSchema = z.object({
  status: z.enum(['RESOLVED', 'ADJUDICATED', 'DISMISSED', 'INVESTIGATING', 'UNDER_REVIEW']).optional(),
  managerNotes: z.string().max(4000).optional(),
  resolutionOutcome: z.string().max(2000).optional(),
  decision: z.enum(['USER_LIABLE', 'PREEXISTING_FATIGUE', 'SHARED_LIABILITY', 'DISMISSED']).optional(),
  penaltyPointsAssigned: z.number().min(0).optional(),
  penaltyHours: z.number().min(0).optional(),
  billingChargeAmount: z.number().min(0).optional(),
  grantCodeCharged: z.string().max(50).optional(),
  actionItemsRequired: z.array(z.string()).optional(),
  findingsSummary: z.string().max(4000).optional(),
});

export const disputeIncidentSchema = z.object({
  disputeStatement: z.string().min(5, 'Dispute statement must be at least 5 characters').max(4000).optional(),
  disputeDetails: z.string().min(5, 'Dispute details must be at least 5 characters').max(4000).optional(),
  evidencePhotos: z.array(evidencePhotoSchema).default([]).optional(),
}).refine((data) => data.disputeStatement || data.disputeDetails, {
  message: 'Either disputeStatement or disputeDetails is required',
});

export const queryIncidentsSchema = z.object({
  status: z.string().optional(),
  severity: z.string().optional(),
  category: z.string().optional(),
  bookingId: z.string().optional(),
  resourceId: z.string().optional(),
  accusedParty: z.string().optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
});

export type CreateIncidentDTO = z.infer<typeof createIncidentSchema>;
export type ResolveIncidentDTO = z.infer<typeof resolveIncidentSchema>;
export type DisputeIncidentDTO = z.infer<typeof disputeIncidentSchema>;
export type QueryIncidentsDTO = z.infer<typeof queryIncidentsSchema>;
