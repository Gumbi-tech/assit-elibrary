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

export type DepartmentScopeReason =
  | 'OK'
  | 'ADMIN_ALL_DEPARTMENTS'
  | 'NO_DEPARTMENT_ASSIGNED'
  | 'CROSS_DEPARTMENT_FORBIDDEN'
  | 'DEPARTMENT_EMPTY';

export interface DepartmentScopeFeedback {
  reason: DepartmentScopeReason;
  message: string;
  userDepartmentId: string | null;
  userDepartmentName: string | null;
  userDepartmentCode: string | null;
  requestedDepartmentId: string | null;
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

function normalizeToken(val?: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface AccessContext {
  userId: string;
  role: AppRole;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
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

async function resolveDepartmentRecord(
  rawDepartmentId?: string | null,
  rawDepartment?: string | null
): Promise<{ id: string; name: string; code: string | null } | null> {
  if (rawDepartmentId && rawDepartmentId.trim()) {
    const byId = await prisma.department.findUnique({
      where: { id: rawDepartmentId.trim() },
      select: { id: true, name: true, code: true },
    });
    if (byId) return byId;
  }

  if (!rawDepartment || !rawDepartment.trim()) {
    return null;
  }

  const normTarget = normalizeToken(rawDepartment);
  const allDepts = await prisma.department.findMany({
    select: { id: true, name: true, code: true },
  });

  for (const dept of allDepts) {
    if (
      normalizeToken(dept.code) === normTarget ||
      normalizeToken(dept.name) === normTarget ||
      normalizeToken(dept.id) === normTarget
    ) {
      return dept;
    }
  }

  return null;
}

async function getUserFromHeader(): Promise<AccessContext | null> {
  try {
    const headerStore = await headers();
    const rawHeader = headerStore.get('x-elibrary-user');
    if (!rawHeader) return null;

    const parsed = JSON.parse(decodeURIComponent(rawHeader)) as ClientUserHeaderPayload;
    if (parsed.isActive === false) return null;

    const role = normalizeRole(parsed.role);
    if (!role) return null;

    const email = parsed.email?.trim().toLowerCase() || null;
    const studentId = parsed.studentId?.trim().toUpperCase() || null;
    if (!email && !studentId && !parsed.id) return null;

    const resolvedDept = await resolveDepartmentRecord(
      parsed.departmentId,
      parsed.department
    );

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
        department: true,
        departmentId: true,
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
          department: resolvedDept?.code ?? parsed.department ?? null,
          departmentId: resolvedDept?.id ?? null,
          mustChangePassword: false,
        },
        select: {
          id: true,
          role: true,
          department: true,
          departmentId: true,
          status: true,
        },
      });
    } else if (dbUser && resolvedDept && dbUser.departmentId !== resolvedDept.id) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          departmentId: resolvedDept.id,
          department: resolvedDept.code ?? parsed.department ?? dbUser.department,
        },
        select: {
          id: true,
          role: true,
          department: true,
          departmentId: true,
          status: true,
        },
      });
    }

    const activeDept =
      resolvedDept ||
      (await resolveDepartmentRecord(dbUser?.departmentId, dbUser?.department));

    const effectiveUserId = dbUser?.id ?? parsed.id ?? email ?? 'client-user';
    const finalRole = normalizeRole(dbUser?.role) ?? role;

    return {
      userId: effectiveUserId,
      role: finalRole,
      departmentId: activeDept?.id ?? dbUser?.departmentId ?? null,
      departmentName: activeDept?.name ?? parsed.department ?? null,
      departmentCode: activeDept?.code ?? parsed.department ?? null,
    };
  } catch (err) {
    console.error('[getUserFromHeader] failed:', err);
    return null;
  }
}

export async function getAccessContext(): Promise<AccessContext | null> {
  // Prefer explicit client context header when sent so switching accounts/roles in UI is immediate
  const headerCtx = await getUserFromHeader();
  if (headerCtx) {
    return headerCtx;
  }

  const session = await getCurrentSession();
  if (session?.userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        department: true,
        departmentId: true,
        status: true,
      },
    });

    if (dbUser && dbUser.status === 'ACTIVE') {
      const resolvedRole = normalizeRole(dbUser.role) ?? normalizeRole(session.role);
      if (resolvedRole) {
        const activeDept = await resolveDepartmentRecord(
          dbUser.departmentId,
          dbUser.department
        );
        return {
          userId: dbUser.id,
          role: resolvedRole,
          departmentId: activeDept?.id ?? dbUser.departmentId,
          departmentName: activeDept?.name ?? dbUser.department ?? null,
          departmentCode: activeDept?.code ?? dbUser.department ?? null,
        };
      }
    }
  }

  return null;
}

export function isDepartmentScopedRole(role: AppRole): boolean {
  return role === 'STUDENT' || role === 'INSTRUCTOR' || role === 'LECTURER';
}

export function buildDocumentWhereClause(
  ctx: AccessContext,
  filters?: { courseId?: string; departmentId?: string }
): {
  where: DocumentWhereClause;
  feedback: DepartmentScopeFeedback;
} {
  const requestedCourseId = filters?.courseId?.trim() || undefined;
  const requestedDeptId = filters?.departmentId?.trim() || undefined;
  const deptLabel = ctx.departmentName || ctx.departmentCode || 'your department';

  if (!isDepartmentScopedRole(ctx.role)) {
    return {
      where: {
        ...(requestedCourseId ? { courseId: requestedCourseId } : {}),
        ...(requestedDeptId ? { departmentId: requestedDeptId } : {}),
      } as DocumentWhereClause,
      feedback: {
        reason: 'ADMIN_ALL_DEPARTMENTS',
        message: requestedDeptId
          ? 'Showing documents for the selected department.'
          : 'Showing documents across all departments.',
        userDepartmentId: ctx.departmentId,
        userDepartmentName: ctx.departmentName,
        userDepartmentCode: ctx.departmentCode,
        requestedDepartmentId: requestedDeptId ?? null,
      },
    };
  }

  if (!ctx.departmentId) {
    return {
      where: { id: '__no_access__' } as DocumentWhereClause,
      feedback: {
        reason: 'NO_DEPARTMENT_ASSIGNED',
        message:
          'Your account has no department assigned in the database. No documents from other departments are shown.',
        userDepartmentId: null,
        userDepartmentName: null,
        userDepartmentCode: null,
        requestedDepartmentId: requestedDeptId ?? null,
      },
    };
  }

  if (requestedDeptId && requestedDeptId !== ctx.departmentId) {
    return {
      where: { id: '__no_access__' } as DocumentWhereClause,
      feedback: {
        reason: 'CROSS_DEPARTMENT_FORBIDDEN',
        message: `Access restricted: your account belongs to ${deptLabel}, so you cannot view another department's content.`,
        userDepartmentId: ctx.departmentId,
        userDepartmentName: ctx.departmentName,
        userDepartmentCode: ctx.departmentCode,
        requestedDepartmentId: requestedDeptId,
      },
    };
  }

  const deptScope = {
    OR: [
      { departmentId: ctx.departmentId },
      { course: { departmentId: ctx.departmentId } },
    ],
  };

  return {
    where: {
      AND: [
        deptScope,
        ...(requestedCourseId ? [{ courseId: requestedCourseId }] : []),
      ],
    } as DocumentWhereClause,
    feedback: {
      reason: 'OK',
      message: `Showing documents for ${deptLabel} only.`,
      userDepartmentId: ctx.departmentId,
      userDepartmentName: ctx.departmentName,
      userDepartmentCode: ctx.departmentCode,
      requestedDepartmentId: ctx.departmentId,
    },
  };
}

export function canUserAccessDocument(
  ctx: AccessContext,
  doc: {
    departmentId: string | null;
    course?: { departmentId: string } | null;
  }
): boolean {
  if (!isDepartmentScopedRole(ctx.role)) return true;
  if (!ctx.departmentId) return false;

  const effectiveDeptId = doc.departmentId ?? doc.course?.departmentId ?? null;
  return effectiveDeptId === ctx.departmentId;
}