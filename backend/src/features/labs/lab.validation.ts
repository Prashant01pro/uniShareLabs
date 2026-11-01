import { z } from 'zod';

export const operationalHoursValidationSchema = z
  .object({
    dailyStartTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'dailyStartTime must be formatted as HH:mm (24-hour)'),
    dailyEndTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'dailyEndTime must be formatted as HH:mm (24-hour)'),
    allowedDays: z
      .array(z.number().int().min(1, 'Day must be >= 1 (Monday)').max(7, 'Day must be <= 7 (Sunday)'))
      .min(1, 'At least one allowed day of the week must be specified'),
  })
  .refine(
    (val) => {
      const [startH, startM] = val.dailyStartTime.split(':').map(Number);
      const [endH, endM] = val.dailyEndTime.split(':').map(Number);
      return endH * 60 + endM > startH * 60 + startM;
    },
    {
      message: 'dailyEndTime must be strictly greater than dailyStartTime',
      path: ['dailyEndTime'],
    }
  );

export const createLabSchema = z.object({
  name: z
    .string({ required_error: 'Laboratory name is required' })
    .min(2, 'Laboratory name must be at least 2 characters')
    .max(150, 'Laboratory name cannot exceed 150 characters')
    .trim(),
  code: z
    .string({ required_error: 'Laboratory code is required' })
    .min(2, 'Laboratory code must be at least 2 characters')
    .max(50, 'Laboratory code cannot exceed 50 characters')
    .trim()
    .transform((val) => val.toUpperCase()),
  institution: z
    .string()
    .min(2, 'Institution name must be at least 2 characters')
    .max(150, 'Institution name cannot exceed 150 characters')
    .trim()
    .optional(),
  department: z
    .string({ required_error: 'Department is required' })
    .min(2, 'Department must be at least 2 characters')
    .max(100, 'Department cannot exceed 100 characters')
    .trim(),
  building: z
    .string({ required_error: 'Building is required' })
    .min(1, 'Building cannot be empty')
    .max(100, 'Building cannot exceed 100 characters')
    .trim(),
  room: z
    .string({ required_error: 'Room is required' })
    .min(1, 'Room cannot be empty')
    .max(50, 'Room cannot exceed 50 characters')
    .trim(),
  safetyOfficerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'safetyOfficerId must be a valid 24-character hex ObjectId')
    .optional()
    .nullable(),
  contactEmail: z
    .string({ required_error: 'Contact email is required' })
    .email('Please provide a valid contact email')
    .toLowerCase()
    .trim(),
  operationalHours: operationalHoursValidationSchema.optional(),
  certificationsSupported: z
    .array(z.string().trim().min(1, 'Certification code cannot be empty'))
    .optional()
    .default([]),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').trim().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').optional(),
  safetyLevel: z.enum(['LEVEL_1_GENERAL', 'LEVEL_2_SUPERVISED', 'LEVEL_3_RESTRICTED']).optional(),
  isActive: z.boolean().optional(),
});

export const updateLabSchema = z.object({
  name: z.string().min(2).max(150).trim().optional(),
  code: z
    .string()
    .min(2)
    .max(50)
    .trim()
    .transform((val) => val.toUpperCase())
    .optional(),
  institution: z.string().min(2).max(150).trim().optional(),
  department: z.string().min(2).max(100).trim().optional(),
  building: z.string().min(1).max(100).trim().optional(),
  room: z.string().min(1).max(50).trim().optional(),
  safetyOfficerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'safetyOfficerId must be a valid 24-character hex ObjectId')
    .optional()
    .nullable(),
  contactEmail: z.string().email().toLowerCase().trim().optional(),
  operationalHours: operationalHoursValidationSchema.optional(),
  certificationsSupported: z.array(z.string().trim().min(1)).optional(),
  description: z.string().max(2000).trim().optional(),
  capacity: z.number().int().min(1).optional(),
  safetyLevel: z.enum(['LEVEL_1_GENERAL', 'LEVEL_2_SUPERVISED', 'LEVEL_3_RESTRICTED']).optional(),
  isActive: z.boolean().optional(),
});

export const labIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Lab ID must be a valid 24-character hexadecimal ObjectId'),
});

export const labQuerySchema = z.object({
  department: z.string().trim().optional(),
  building: z.string().trim().optional(),
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateLabInput = z.infer<typeof createLabSchema>;
export type UpdateLabInput = z.infer<typeof updateLabSchema>;
export type LabQueryInput = z.infer<typeof labQuerySchema>;
