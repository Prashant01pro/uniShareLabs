import { z } from 'zod';

export const resourceCategorySchema = z.enum([
  'LAB_BENCH',
  'TESTING_INSTRUMENT',
  'MAKERSPACE_TOOL',
  'CLEANROOM_BAY',
  'COMPUTING_CLUSTER',
  'MICROSCOPES',
  'CLEANROOMS',
  'MAKERSPACE_3D_PRINTERS',
  'SPECTROMETERS',
  'CNC_MACHINING',
  'GENERAL_LAB',
]);

export const resourceStatusSchema = z.enum([
  'AVAILABLE',
  'MAINTENANCE',
  'DECOMMISSIONED',
  'OFFLINE',
]);

export const safetyLevelSchema = z.enum([
  'LEVEL_1_GENERAL',
  'LEVEL_2_SUPERVISED',
  'LEVEL_3_RESTRICTED',
]);

export const approvalModeSchema = z.enum(['AUTOMATIC', 'MANUAL_REVIEW']);

export const accessControlMethodSchema = z.enum([
  'DIGITAL_PIN',
  'RFID_BADGE',
  'KEYBOX_CODE',
  'STAFF_HANDOVER',
]);

export const operatingHoursSchema = z.object({
  allowedDays: z
    .array(z.number().int().min(1).max(7))
    .optional()
    .default([1, 2, 3, 4, 5]),
  dailyStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'dailyStartTime must be HH:mm')
    .optional()
    .default('08:00'),
  dailyEndTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'dailyEndTime must be HH:mm')
    .optional()
    .default('20:00'),
});

export const calendarSchema = operatingHoursSchema.extend({
  slotGranularityMinutes: z.number().int().min(5).max(1440).optional().default(30),
  minDurationMinutes: z.number().int().min(5).max(1440).optional().default(30),
  maxDurationMinutes: z.number().int().min(5).max(10080).optional().default(240),
  bufferTimeMinutes: z.number().int().min(0).max(1440).optional().default(15),
  advanceBookingDaysMax: z.number().int().min(1).max(365).optional().default(14),
  leadTimeMinutesMin: z.number().int().min(0).max(10080).optional().default(60),
});

export const checklistItemValidationSchema = z.object({
  itemId: z.string().trim().min(1, 'itemId cannot be empty'),
  itemText: z.string().trim().min(1, 'itemText cannot be empty'),
  isCritical: z.boolean().optional().default(false),
});

export const customChecklistsValidationSchema = z.object({
  preUse: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        text: z.string().trim().min(1),
        isCritical: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
  postUse: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        text: z.string().trim().min(1),
        isCritical: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
});

export const meterConfigValidationSchema = z.object({
  meterKey: z.string().trim().min(1),
  label: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  meterType: z.enum(['INCREMENTAL_COUNTER', 'GAUGE_VALUE', 'CYCLE_COUNT']),
  warningDeltaThreshold: z.number().optional(),
});

export const inspectionConfigValidationSchema = z.object({
  checklistItems: z.array(checklistItemValidationSchema).optional().default([]),
  meters: z.array(meterConfigValidationSchema).optional().default([]),
  requirePhotos: z.boolean().optional().default(true),
  maxPhotos: z.number().int().min(0).max(10).optional().default(4),
});

export const requiredCertValidationSchema = z.object({
  certCode: z.string().trim().min(1, 'certCode cannot be empty'),
  name: z.string().trim().min(1, 'Certification name cannot be empty'),
  validityPeriodDays: z.number().int().min(1).optional().default(365),
});

export const prerequisitesValidationSchema = z.object({
  minRole: z.enum(['STUDENT', 'RESEARCHER', 'RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN']).optional().default('STUDENT'),
  requiredCertifications: z.array(requiredCertValidationSchema).optional().default([]),
  requiredSafetyTrainings: z.array(z.string().trim().min(1)).optional().default([]),
  supervisorEndorsementRequired: z.boolean().optional().default(false),
  projectGrantCodeRequired: z.boolean().optional().default(false),
  requiresInduction: z.boolean().optional().default(false),
  safetyAgreementRequired: z.boolean().optional().default(true),
});

export const maintenanceWindowValidationSchema = z.object({
  windowId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  recurrence: z.enum(['NONE', 'WEEKLY', 'MONTHLY']).optional().default('NONE'),
  blocksBookings: z.boolean().optional().default(true),
});

export const accessControlValidationSchema = z.object({
  method: accessControlMethodSchema.optional().default('DIGITAL_PIN'),
  pinSecretHash: z.string().optional(),
});

export const createResourceSchema = z
  .object({
    title: z.string().min(2, 'Resource title must be at least 2 characters').max(150).trim().optional(),
    name: z.string().min(2, 'Resource name must be at least 2 characters').max(150).trim().optional(),
    code: z
      .string({ required_error: 'Resource code is required' })
      .min(2, 'Resource code must be at least 2 characters')
      .max(50, 'Resource code cannot exceed 50 characters')
      .trim()
      .transform((val) => val.toUpperCase()),
    category: resourceCategorySchema,
    department: z.string({ required_error: 'Department is required' }).min(2).max(100).trim(),
    labLocation: z.string({ required_error: 'Lab location is required' }).min(1).max(200).trim(),
    labId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'labId must be a valid 24-character hex ObjectId')
      .optional()
      .nullable(),
    ownerId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'ownerId must be a valid 24-character hex ObjectId')
      .optional(),
    delegates: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Delegate must be a valid ObjectId'))
      .optional()
      .default([]),
    description: z.string({ required_error: 'Description is required' }).min(5).max(4000).trim(),
    specs: z.record(z.any()).optional().default({}),
    specifications: z.record(z.any()).optional().default({}),
    status: resourceStatusSchema.optional().default('AVAILABLE'),
    approvalMode: approvalModeSchema.optional().default('MANUAL_REVIEW'),
    hourlyRate: z.number().min(0, 'Hourly rate cannot be negative').optional().default(0),
    safetyLevel: safetyLevelSchema.optional().default('LEVEL_1_GENERAL'),
    capacity: z.number().int().min(1, 'Capacity must be at least 1').optional().default(1),
    leadTimeHours: z.number().min(0).optional().default(1),
    bufferMinutes: z.number().min(0).optional().default(15),
    cooldownMinutes: z.number().min(0).optional().default(0),
    operatingHours: operatingHoursSchema.optional(),
    calendar: calendarSchema.optional(),
    customChecklists: customChecklistsValidationSchema.optional(),
    inspectionChecklist: z.array(checklistItemValidationSchema).optional().default([]),
    inspectionConfig: inspectionConfigValidationSchema.optional(),
    requiredCertifications: z.array(requiredCertValidationSchema).optional().default([]),
    prerequisites: prerequisitesValidationSchema.optional(),
    maintenanceWindows: z.array(maintenanceWindowValidationSchema).optional().default([]),
    accessControl: accessControlValidationSchema.optional(),
  })
  .refine((data) => Boolean(data.title || data.name), {
    message: 'Either title or name must be provided',
    path: ['title'],
  });

export const updateResourceSchema = z.object({
  title: z.string().min(2).max(150).trim().optional(),
  name: z.string().min(2).max(150).trim().optional(),
  code: z
    .string()
    .min(2)
    .max(50)
    .trim()
    .transform((val) => val.toUpperCase())
    .optional(),
  category: resourceCategorySchema.optional(),
  department: z.string().min(2).max(100).trim().optional(),
  labLocation: z.string().min(1).max(200).trim().optional(),
  labId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'labId must be a valid ObjectId')
    .optional()
    .nullable(),
  delegates: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  description: z.string().min(5).max(4000).trim().optional(),
  specs: z.record(z.any()).optional(),
  specifications: z.record(z.any()).optional(),
  status: resourceStatusSchema.optional(),
  approvalMode: approvalModeSchema.optional(),
  hourlyRate: z.number().min(0).optional(),
  safetyLevel: safetyLevelSchema.optional(),
  capacity: z.number().int().min(1).optional(),
  leadTimeHours: z.number().min(0).optional(),
  bufferMinutes: z.number().min(0).optional(),
  cooldownMinutes: z.number().min(0).optional(),
  operatingHours: operatingHoursSchema.optional(),
  calendar: calendarSchema.optional(),
  customChecklists: customChecklistsValidationSchema.optional(),
  inspectionChecklist: z.array(checklistItemValidationSchema).optional(),
  inspectionConfig: inspectionConfigValidationSchema.optional(),
  requiredCertifications: z.array(requiredCertValidationSchema).optional(),
  prerequisites: prerequisitesValidationSchema.optional(),
  maintenanceWindows: z.array(maintenanceWindowValidationSchema).optional(),
  accessControl: accessControlValidationSchema.optional(),
});

export const resourceIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Resource ID must be a valid 24-character hexadecimal ObjectId'),
});

export const resourceQuerySchema = z.object({
  category: z.string().trim().optional(),
  department: z.string().trim().optional(),
  status: z.string().trim().optional(),
  labId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  safetyLevel: z.string().trim().optional(),
  search: z.string().trim().optional(),
  eligibleOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const eligibilityQuerySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  safetyAgreementSigned: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ResourceQueryInput = z.infer<typeof resourceQuerySchema>;
export type EligibilityQueryInput = z.infer<typeof eligibilityQuerySchema>;
