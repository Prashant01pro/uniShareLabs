import { z } from 'zod';

export const userRoleEnum = z.enum([
  'STUDENT',
  'RESEARCHER',
  'RESOURCE_OWNER',
  'LAB_MANAGER',
  'ADMIN',
]);

export const certificationSchema = z
  .object({
    certCode: z
      .string()
      .min(1, 'Certification code is required')
      .max(50, 'Certification code too long')
      .trim(),
    name: z
      .string()
      .min(1, 'Certification name is required')
      .max(150, 'Certification name too long')
      .trim(),
    issuedAt: z.coerce.date({ invalid_type_error: 'issuedAt must be a valid ISO Date' }),
    expiresAt: z.coerce.date({ invalid_type_error: 'expiresAt must be a valid ISO Date' }),
  })
  .refine((data) => data.expiresAt > data.issuedAt, {
    message: 'expiresAt must be chronologically after issuedAt',
    path: ['expiresAt'],
  });

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol'
    ),
  role: userRoleEnum.default('STUDENT').optional(),
  department: z
    .string({ required_error: 'Department is required' })
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name must not exceed 100 characters')
    .trim(),
  labGroupId: z.string().trim().optional(),
  certifications: z.array(certificationSchema).optional().default([]),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1, 'Refresh token cannot be empty')
    .optional(), 
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  department: z.string().min(2).max(100).trim().optional(),
  labGroupId: z.string().trim().optional(),
  certifications: z.array(certificationSchema).optional(),
  weeklyQuotaOverrides: z.record(z.number().min(0)).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
