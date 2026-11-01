import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string()
  .trim()
  .regex(objectIdRegex, 'Invalid MongoDB ObjectId format');

export const REJECTION_REASON_CODES = [
  'EQUIPMENT_MAINTENANCE_OVERRIDE',
  'UNQUALIFIED_PROJECT_SCOPE',
  'INSUFFICIENT_SAFETY_MEASURES',
  'GRANT_ACCOUNT_EXHAUSTED',
  'SUPERVISOR_DENIED',
  'SLOT_UNAVAILABLE',
  'OTHER',
] as const;

export const createBookingSchema = z
  .object({
    resourceId: objectIdSchema,
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO-8601 date-time string' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO-8601 date-time string' }),
    projectGrantCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9\-_]{3,40}$/i, 'Grant code must be 3-40 alphanumeric characters with optional dashes/underscores')
      .optional(),
    supervisorEmail: z.string().trim().email('Invalid supervisor email address').optional(),
    supervisorEndorsed: z.boolean().optional().default(false),
    safetyAcknowledgement: z.boolean().refine((val) => val === true, {
      message: 'Safety acknowledgement must be confirmed before reserving research equipment',
    }),
    intendedPurpose: z
      .string()
      .trim()
      .min(10, 'Intended research purpose must be at least 10 characters long')
      .max(2000, 'Intended purpose cannot exceed 2000 characters'),
    allowWaitlist: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      const s = new Date(data.startTime).getTime();
      const e = new Date(data.endTime).getTime();
      return e > s;
    },
    {
      message: 'endTime must be strictly greater than startTime',
      path: ['endTime'],
    }
  );

export const cancelBookingSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional(),
});

export const approveBookingSchema = z.object({
  approvalNotes: z
    .string()
    .trim()
    .max(1000, 'Approval notes cannot exceed 1000 characters')
    .optional(),
});

export const rejectBookingSchema = z.object({
  reasonCode: z.enum(REJECTION_REASON_CODES, {
    errorMap: () => ({ message: `reasonCode must be one of: ${REJECTION_REASON_CODES.join(', ')}` }),
  }),
  rejectionMessage: z
    .string()
    .trim()
    .min(5, 'Rejection message must provide at least 5 characters of feedback')
    .max(1000, 'Rejection message cannot exceed 1000 characters')
    .optional(),
});

export const delegateBookingSchema = z.object({
  delegateUserId: objectIdSchema,
  note: z.string().trim().max(500).optional(),
});

export const queryBookingsSchema = z.object({
  status: z
    .enum([
      'DRAFT',
      'PENDING_VERIFICATION',
      'AWAITING_APPROVAL',
      'PENDING_REVIEW',
      'APPROVED',
      'WAITLISTED',
      'OFFERED',
      'CHECKED_IN',
      'IN_USE',
      'RETURNED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'DISPUTED',
      'NO_SHOW',
      'RESOLVED',
    ])
    .optional(),
  resourceId: objectIdSchema.optional(),
  userId: objectIdSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const bookingIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ApproveBookingInput = z.infer<typeof approveBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type QueryBookingsInput = z.infer<typeof queryBookingsSchema>;
export type BookingIdParamInput = z.infer<typeof bookingIdParamSchema>;
