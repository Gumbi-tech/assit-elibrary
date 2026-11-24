// lib/document-access.ts
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

export type AppRole = 'STUDENT' | 'LECTURER' | 'LIBRARIAN' | 'INSTRUCTOR' | 'ADMIN';

export interface AccessContext {
  userId: string;
  role: AppRole;
}

const VALID_ROLES: readonly AppRole[] = [
  'STUDENT',
  'LECTURER',
  'LIBRARIAN',
  'INSTRUCTOR',
  'ADMIN',
];

function normalizeRole(rawRole: unknown): AppRole | null {
  if (typeof rawRole !== 'string') return null;
  const upper = rawRole.trim().toUpperCase();
  if (upper === 'SYSTEM_ADMIN') return 'ADMIN';
  return VALID_ROLES.includes(upper as AppRole) ? (upper as AppRole) : null;
}

async function getUserFromHeader(): Promise<AccessContext | null> {
  try {
    const headerStore = await headers();
    const rawHeader = headerStore.get('x-elibrary-user');
    if (!rawHeader) return null;

    const parsed = JSON.parse(decodeURIComponent(rawHeader)) as {
      id?: string;
      email?: string;
      studentId?: string | null;
      fullName?: string;
      name?: string;
      role?: string;
      isActive?: boolean;
    };
    if (parsed.isActive === false) return null;

    const role = normalizeRole(parsed.role);
    if (!role) return null;

    const email = parsed.email?.trim().toLowerCase() || null;
    const studentId = parsed.studentId?.trim().toUpperCase() || null;
    if (!email && !studentId && !parsed.id) return null;

    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(parsed.id ? [{ id: parsed.id }] : []),
          ...(email ? [{ email }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (dbUser && dbUser.status !== 'ACTIVE') {
      return null;
    }

    if (!dbUser && email) {
      dbUser = await prisma.user.create({
        data: {
          email,
          studentId,
          fullName: parsed.fullName || parsed.name || email,
          passwordHash: 'client-synced-session',
          role: role as never,
          status: 'ACTIVE',
          mustChangePassword: false,
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });
    }

    return {
      userId: dbUser?.id ?? parsed.id ?? email ?? 'client-user',
      role: normalizeRole(dbUser?.role) ?? role,
    };
  } catch (err) {
    console.error('[getUserFromHeader] failed:', err);
    return null;
  }
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const headerCtx = await getUserFromHeader();
  if (headerCtx) return headerCtx;

  const session = await getCurrentSession();
  if (session?.userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (dbUser && dbUser.status === 'ACTIVE') {
      const resolvedRole = normalizeRole(dbUser.role) ?? normalizeRole(session.role);
      if (resolvedRole) {
        return {
          userId: dbUser.id,
          role: resolvedRole,
        };
      }
    }
  }

  return null;
}

export function canManageDocuments(role: AppRole): boolean {
  return role !== 'STUDENT';
}

export function canReadDocuments(ctx: AccessContext | null): boolean {
  return Boolean(ctx);
}