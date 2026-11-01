import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const checklistItemResponseSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  itemText: z.string().optional(),
  verified: z.boolean(),
  note: z.string().max(500).optional(),
  isCritical: z.boolean().default(false).optional(),
});

export const photoUploadItemSchema = z.object({
  photoUrl: z.string().min(1, 'Photo URL is required'),
  sha256Hash: z.string().default('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
  caption: z.string().max(500).optional(),
  uploadedAt: z.coerce.date().optional(),
});

export const digitalSignatureInputSchema = z.object({
  signedBy: z.string().regex(objectIdRegex).optional(),
  signerName: z.string().optional(),
  signedAt: z.coerce.date().optional(),
  signatureHash: z.string().optional(),
});

export const checkInInspectionSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format'),
  resourceId: z.string().regex(objectIdRegex).optional(),
  initialConditionRating: z
    .enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
    .optional(),
  conditionRating: z
    .enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
    .optional(),
  checklistResponses: z.array(checklistItemResponseSchema).default([]),
  meterReadings: z.record(z.coerce.number()).default({}),
  preExistingDamageNotes: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  photoUploads: z.array(photoUploadItemSchema).default([]).optional(),
  photos: z.array(photoUploadItemSchema).default([]).optional(),
  digitalSignature: digitalSignatureInputSchema.optional(),
  inspectorRole: z
    .enum(['STUDENT', 'RESEARCHER', 'RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN', 'LAB_TECH'])
    .default('STUDENT')
    .optional(),
}).refine((data) => data.initialConditionRating || data.conditionRating, {
  message: 'Either initialConditionRating or conditionRating is required',
});

export const returnInspectionSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format'),
  resourceId: z.string().regex(objectIdRegex).optional(),
  finalConditionRating: z
    .enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
    .optional(),
  conditionRating: z
    .enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
    .optional(),
  checklistResponses: z.array(checklistItemResponseSchema).default([]),
  finalMeterReadings: z.record(z.coerce.number()).optional(),
  meterReadings: z.record(z.coerce.number()).optional(),
  returnNotes: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  photoUploads: z.array(photoUploadItemSchema).default([]).optional(),
  photos: z.array(photoUploadItemSchema).default([]).optional(),
  signOffConfirmed: z.boolean().default(true).optional(),
  digitalSignature: digitalSignatureInputSchema.optional(),
  inspectorRole: z
    .enum(['STUDENT', 'RESEARCHER', 'RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN', 'LAB_TECH'])
    .default('STUDENT')
    .optional(),
}).refine((data) => data.finalConditionRating || data.conditionRating, {
  message: 'Either finalConditionRating or conditionRating is required',
});

export const getBookingInspectionsSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format'),
});

export type CheckInInspectionDTO = z.infer<typeof checkInInspectionSchema>;
export type ReturnInspectionDTO = z.infer<typeof returnInspectionSchema>;
