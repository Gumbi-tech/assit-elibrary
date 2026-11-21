'use client';

import { LoginSchema, ChangePasswordSchema, BulkAccountRowSchema } from '@/lib/validators/account';
import { generateTempPassword } from '@/lib/import/parseAccountsFile';
import type { ExtendedUser } from '@/context/AuthContext';
import type { Role, Department } from '@/types/elibrary';

export type ProvisionedUser = ExtendedUser & {
  tempPassword: string;
  mustChangePassword: boolean;
};

export interface BulkImportUserResult {
  created: ProvisionedUser[];
  updated: ExtendedUser[];
  skipped: Array<{ email: string; studentId?: string; reason: string }>;
}

export interface AuthActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
  mustChangePassword?: boolean;
}

function normalizeRoleForApp(rawRole?: string): Role {
  const upper = (rawRole || 'STUDENT').toUpperCase();
  if (upper === 'ADMIN' || upper === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (upper === 'INSTRUCTOR' || upper === 'LECTURER') return 'INSTRUCTOR';
  return 'STUDENT';
}

function normalizeDeptForApp(rawDept?: string, role?: Role): Department | undefined {
  if (role === 'SYSTEM_ADMIN') return undefined;
  const upper = (rawDept || '').toUpperCase().replace(/\s+/g, '_');
  if (upper === 'CYBER_SECURITY' || upper === 'CYBERSECURITY') return 'CYBER_SECURITY';
  if (upper === 'MULTIMEDIA' || upper === 'MULTI_MEDIA') return 'MULTIMEDIA';
  return 'SOFTWARE_ENGINEERING';
}

/**
 * Authenticates a user using a single identifier (Student ID or Email) + Password.
 * Checks known users first, and falls back to /api/auth/login if not found locally.
 */
export async function loginRequest(
  identifier: string,
  password: string,
  knownUsers: ExtendedUser[] = []
): Promise<AuthActionResult<ExtendedUser>> {
  const parsed = LoginSchema.safeParse({ identifier, password });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || 'Enter your Student ID/Email and password.',
    };
  }

  const rawIdentifier = parsed.data.identifier.trim();
  const query = rawIdentifier.toLowerCase();

  const matched = knownUsers.find((u) => {
    const emailMatch = u.email?.toLowerCase() === query;
    const studentIdMatch = u.studentId ? u.studentId.toLowerCase() === query : false;
    const idMatch = u.id?.toLowerCase() === query;
    return emailMatch || studentIdMatch || idMatch;
  });

  if (matched) {
    if (matched.isActive === false) {
      return {
        ok: false,
        error: 'This account is inactive. Contact your system or library administrator.',
      };
    }

    const expectedPassword = matched.password || 'password123';
    if (parsed.data.password !== expectedPassword) {
      return {
        ok: false,
        error: 'Incorrect password for this account.',
      };
    }

    const mustChange = Boolean(matched.mustChangePassword);
    return {
      ok: true,
      mustChangePassword: mustChange,
      data: {
        ...matched,
        isActive: true,
        mustChangePassword: mustChange,
      },
    };
  }

  // Fallback to server login endpoint if the account isn't in `knownUsers` yet
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: rawIdentifier,
        password: parsed.data.password,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data?.user) {
      const mustChange = Boolean(data.mustChangePassword ?? data.user.mustChangePassword);
      return {
        ok: true,
        mustChangePassword: mustChange,
        data: {
          ...data.user,
          isActive: data.user.isActive !== false,
          mustChangePassword: mustChange,
        },
      };
    }

    return {
      ok: false,
      error: data?.error || 'No account found for that Student ID or Email address.',
    };
  } catch {
    return {
      ok: false,
      error: 'No account found for that Student ID or Email address.',
    };
  }
}

/**
 * Updates the user's password and clears `mustChangePassword` on first login.
 */
export async function changePasswordRequest(
  user: ExtendedUser,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthActionResult<ExtendedUser>> {
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || 'Invalid password update details.',
    };
  }

  const expectedCurrent = user.password || 'password123';
  if (parsed.data.currentPassword !== expectedCurrent) {
    return {
      ok: false,
      error: 'Current or temporary password is incorrect.',
    };
  }

  const updatedUser: ExtendedUser = {
    ...user,
    password: parsed.data.newPassword,
    mustChangePassword: false,
  };

  return {
    ok: true,
    mustChangePassword: false,
    data: updatedUser,
  };
}

/**
 * Clears active session state.
 */
export async function logoutRequest(): Promise<AuthActionResult> {
  return { ok: true };
}

/**
 * Validates and provisions bulk accounts with full submission/profile fields,
 * duplicate handling ('skip' | 'update'), and temporary passwords with `mustChangePassword: true`.
 */
export async function bulkImportUsersRequest(
  rawRows: Array<Record<string, unknown>>,
  existingUsers: ExtendedUser[],
  options: { onDuplicate?: 'skip' | 'update'; defaultTempPassword?: string } = {}
): Promise<AuthActionResult<BulkImportUserResult>> {
  const onDuplicate = options.onDuplicate || 'skip';

  const created: ProvisionedUser[] = [];
  const updated: ExtendedUser[] = [];
  const skipped: Array<{ email: string; studentId?: string; reason: string }> = [];

  const byEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
  const byStudentId = new Map(
    existingUsers
      .filter((u) => Boolean(u.studentId))
      .map((u) => [u.studentId!.toLowerCase(), u])
  );

  for (const raw of rawRows) {
    const candidate = {
      studentId: raw.studentId ?? raw.student_id,
      email: raw.email,
      fullName: raw.fullName ?? raw.full_name ?? raw.name,
      role: raw.role ? String(raw.role).toUpperCase() : 'STUDENT',
      department: raw.department,
      program: raw.program,
      yearOfStudy: raw.yearOfStudy ?? raw.year_of_study,
      phone: raw.phone,
      profileData: raw.profileData,
    };

    const parsed = BulkAccountRowSchema.safeParse(candidate);
    if (!parsed.success) {
      skipped.push({
        email: String(raw.email || ''),
        studentId: raw.studentId ? String(raw.studentId) : undefined,
        reason: parsed.error.issues[0]?.message || 'Invalid row data',
      });
      continue;
    }

    const row = parsed.data;
    const matchExisting =
      byEmail.get(row.email.toLowerCase()) ||
      (row.studentId ? byStudentId.get(row.studentId.toLowerCase()) : undefined);

    const mappedRole = normalizeRoleForApp(row.role);
    const mappedDept = normalizeDeptForApp(row.department, mappedRole);

    if (matchExisting) {
      if (onDuplicate === 'skip') {
        skipped.push({
          email: row.email,
          studentId: row.studentId,
          reason: 'Account already exists',
        });
        continue;
      }

      const mergedUser: ExtendedUser = {
        ...matchExisting,
        name: row.fullName,
        email: row.email,
        studentId: row.studentId ?? matchExisting.studentId,
        role: mappedRole,
        department: mappedDept ?? matchExisting.department,
        phone: row.phone ?? matchExisting.phone,
        ...(row.profileData ? { profileData: row.profileData } : {}),
      };

      updated.push(mergedUser);
      continue;
    }

    const tempPassword = options.defaultTempPassword || generateTempPassword(10);
    const newUser: ProvisionedUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: row.fullName,
      email: row.email,
      studentId: row.studentId,
      role: mappedRole,
      department: mappedDept,
      phone: row.phone,
      password: tempPassword,
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      tempPassword,
      ...(row.profileData ? { profileData: row.profileData } : {}),
    };

    created.push(newUser);
    byEmail.set(newUser.email.toLowerCase(), newUser);
    if (newUser.studentId) {
      byStudentId.set(newUser.studentId.toLowerCase(), newUser);
    }
  }

  return {
    ok: true,
    data: { created, updated, skipped },
  };
}