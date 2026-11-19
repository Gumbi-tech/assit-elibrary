import { z } from 'zod';

export const RoleEnum = z.enum([
  'STUDENT',
  'INSTRUCTOR',
  'LECTURER',
  'SYSTEM_ADMIN',
  'ADMIN',
]);

export const BulkAccountRowSchema = z
  .object({
    studentId: z
      .string()
      .trim()
      .transform((val) => (val === '' ? undefined : val.toUpperCase()))
      .optional(),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .transform((val) => val.toLowerCase()),
    fullName: z.string().trim().min(1, 'Full name is required'),
    role: RoleEnum.default('STUDENT'),
    department: z.string().trim().optional(),
    program: z.string().trim().optional(),
    yearOfStudy: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
    }, z.number().int().min(1).max(10).optional()),
    phone: z.string().trim().optional(),
    profileData: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const normalizedRole = data.role.toUpperCase();
    if (normalizedRole === 'STUDENT' && !data.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentId'],
        message: 'Student ID is required for STUDENT accounts',
      });
    }
  });

export type ValidatedAccountRow = z.infer<typeof BulkAccountRowSchema>;

export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your Student ID or Email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Temporary/current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from your temporary password',
  });