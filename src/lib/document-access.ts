// lib/document-access.ts
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

type DocumentFindManyFirstArg = Parameters<typeof prisma.document.findMany> extends [
  infer First,
  ...unknown[],
]
  ? NonNullable<First>
  : Record<string, never>;

export type DocumentWhereClause = DocumentFindManyFirstArg extends {
  where?: infer W;
}
  ? NonNullable<W>
  : Record<string, never>;

export type AppRole = 'STUDENT' | 'LECTURER' | 'LIBRARIAN' | 'INSTRUCTOR' | 'ADMIN';

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
  return VALID_ROLES.includes(upper as AppRole) ? (upper as AppRole) : null;
}

export interface AccessContext {
  userId: string;
  role: AppRole;
  departmentId: string | null;
}

interface ClientUserHeaderPayload {
  id?: string;
  email?: string;
  studentId?: string | null;
  fullName?: string;
  name?: string;
  role?: string;
  department?: string | null;
  departmentId?: string | null;
  isActive?: boolean;
}

async function resolveDepartmentId(
  rawDepartmentId?: string | null,
  rawDepartment?: string | null
): Promise<string | null> {
  if (rawDepartmentId && rawDepartmentId.trim()) {
    const byId = await prisma.department.findUnique({
      where: { id: rawDepartmentId.trim() },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  if (!rawDepartment || !rawDepartment.trim()) {
    return null;
  }

  const trimmed = rawDepartment.trim();
  const spaced = trimmed.replace(/[_-]+/g, ' ').trim();
  const compact = spaced.replace(/\s+/g, '');
  const initials = spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');

  const candidates = Array.from(
    new Set([trimmed, spaced, compact, initials].filter(Boolean))
  );

  const dept = await prisma.department.findFirst({
    where: {
      OR: [
        ...candidates.map((val) => ({
          name: { equals: val, mode: 'insensitive' as const },
        })),
        ...candidates.map((val) => ({
          code: { equals: val, mode: 'insensitive' as const },
        })),
        ...candidates.map((val) => ({
          name: { contains: val, mode: 'insensitive' as const },
        })),
      ],
    },
    select: { id: true },
  });

  return dept?.id ?? null;
}

async function getFallbackUserFromHeader(): Promise<AccessContext | null> {
  try {
    const headerStore = await headers();
    const rawHeader = headerStore.get('x-elibrary-user');
    if (!rawHeader) return null;

    const parsed = JSON.parse(decodeURIComponent(rawHeader)) as ClientUserHeaderPayload;
    if (parsed.isActive === false) return null;

    const role = normalizeRole(parsed.role);
    if (!role) return null;

    const email = parsed.email?.trim().toLowerCase();
    const studentId = parsed.studentId?.trim().toUpperCase() || null;

    if (!email && !studentId) return null;

    const resolvedDeptId = await resolveDepartmentId(
      parsed.departmentId,
      parsed.department
    );

    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
      },
      select: {
        id: true,
        role: true,
        departmentId: true,
        status: true,
      },
    });

    if (!dbUser && email) {
      dbUser = await prisma.user.create({
        data: {
          email,
          studentId,
          fullName: parsed.fullName || parsed.name || email,
          passwordHash: 'client-synced-session',
          role: role as never,
          status: 'ACTIVE',
          department: parsed.department ?? null,
          departmentId: resolvedDeptId,
          mustChangePassword: false,
        },
        select: {
          id: true,
          role: true,
          departmentId: true,
          status: true,
        },
      });
    } else if (dbUser && !dbUser.departmentId && resolvedDeptId) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          departmentId: resolvedDeptId,
          ...(parsed.department ? { department: parsed.department } : {}),
        },
        select: {
          id: true,
          role: true,
          departmentId: true,
          status: true,
        },
      });
    }

    if (!dbUser || dbUser.status !== 'ACTIVE') {
      return null;
    }

    const finalRole = normalizeRole(dbUser.role) ?? role;
    return {
      userId: dbUser.id,
      role: finalRole,
      departmentId: dbUser.departmentId ?? resolvedDeptId,
    };
  } catch (err) {
    console.error('[getFallbackUserFromHeader] failed:', err);
    return null;
  }
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const session = await getCurrentSession();

  if (session?.userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        departmentId: true,
        status: true,
      },
    });

    if (dbUser && dbUser.status === 'ACTIVE') {
      const resolvedRole = normalizeRole(dbUser.role) ?? normalizeRole(session.role);
      if (resolvedRole) {
        return {
          userId: dbUser.id,
          role: resolvedRole,
          departmentId: dbUser.departmentId,
        };
      }
    }
  }

  return getFallbackUserFromHeader();
}

export function buildDocumentWhereClause(
  ctx: AccessContext,
  filters?: { courseId?: string; departmentId?: string }
): DocumentWhereClause {
  const requestedCourseId = filters?.courseId?.trim() || undefined;
  const requestedDeptId = filters?.departmentId?.trim() || undefined;

  const isDeptScopedRole =
    ctx.role === 'STUDENT' || ctx.role === 'INSTRUCTOR' || ctx.role === 'LECTURER';

  if (isDeptScopedRole) {
    if (!ctx.departmentId) {
      return { id: '__no_access__' } as DocumentWhereClause;
    }

    if (requestedDeptId && requestedDeptId !== ctx.departmentId) {
      return { id: '__no_access__' } as DocumentWhereClause;
    }

    const deptScope = {
      OR: [
        { departmentId: ctx.departmentId },
        { course: { departmentId: ctx.departmentId } },
      ],
    };

    const courseScope = requestedCourseId
      ? {
          courseId: requestedCourseId,
          course: { departmentId: ctx.departmentId },
        }
      : undefined;

    return {
      AND: [
        deptScope,
        ...(courseScope ? [courseScope] : []),
      ],
    } as DocumentWhereClause;
  }

  // LIBRARIAN, ADMIN
  return {
    ...(requestedCourseId ? { courseId: requestedCourseId } : {}),
    ...(requestedDeptId ? { departmentId: requestedDeptId } : {}),
  } as DocumentWhereClause;
}

export function canUserAccessDocument(
  ctx: AccessContext,
  doc: {
    departmentId: string | null;
    course?: { departmentId: string } | null;
  }
): boolean {
  const isDeptScopedRole =
    ctx.role === 'STUDENT' || ctx.role === 'INSTRUCTOR' || ctx.role === 'LECTURER';

  if (!isDeptScopedRole) return true;
  if (!ctx.departmentId) return false;

  const effectiveDeptId = doc.departmentId ?? doc.course?.departmentId ?? null;
  return effectiveDeptId === ctx.departmentId;
}

