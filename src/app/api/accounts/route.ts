import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { BulkAccountRowSchema } from '@/lib/validators/account';
import { generateTempPassword } from '@/lib/import/parseAccountsFile';

type AppRole = 'STUDENT' | 'INSTRUCTOR' | 'SYSTEM_ADMIN';

function toDbRole(raw?: string): 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' {
  const upper = (raw || 'STUDENT').trim().toUpperCase();
  if (upper === 'SYSTEM_ADMIN' || upper === 'ADMIN') return 'ADMIN';
  if (upper === 'INSTRUCTOR' || upper === 'LECTURER') return 'INSTRUCTOR';
  return 'STUDENT';
}

function toClientRole(dbRole: string): AppRole {
  if (dbRole === 'ADMIN') return 'SYSTEM_ADMIN';
  if (dbRole === 'INSTRUCTOR' || dbRole === 'LECTURER') return 'INSTRUCTOR';
  return 'STUDENT';
}

function serializeUser(u: {
  id: string;
  studentId: string | null;
  email: string;
  fullName: string;
  role: string;
  status: string;
  department: string | null;
  departmentId: string | null;
  phone: string | null;
  profileData: unknown;
  mustChangePassword: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    studentId: u.studentId ?? undefined,
    name: u.fullName,
    email: u.email,
    role: toClientRole(u.role),
    department: u.department ?? undefined,
    departmentId: u.departmentId ?? undefined,
    phone: u.phone ?? undefined,
    profileData: (u.profileData as Record<string, unknown> | null) ?? undefined,
    mustChangePassword: u.mustChangePassword,
    isActive: u.status === 'ACTIVE',
    createdAt: u.createdAt.toISOString().split('T')[0],
  };
}

async function resolveDepartmentId(rawDept?: string | null): Promise<string | null> {
  if (!rawDept || !rawDept.trim()) return null;
  const spaced = rawDept.trim().replace(/[_-]+/g, ' ').trim();
  const dept = await prisma.department.findFirst({
    where: {
      OR: [
        { id: rawDept.trim() },
        { name: { equals: rawDept.trim(), mode: 'insensitive' } },
        { name: { equals: spaced, mode: 'insensitive' } },
        { code: { equals: rawDept.trim(), mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  return dept?.id ?? null;
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      ok: true,
      users: users.map(serializeUser),
    });
  } catch (err) {
    console.error('GET /api/accounts error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to load accounts.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // BULK PROVISIONING
    if (body?.mode === 'bulk') {
      const rawRows = Array.isArray(body.rows) ? body.rows : [];
      const onDuplicate: 'skip' | 'update' = body.onDuplicate === 'update' ? 'update' : 'skip';
      const defaultTempPassword =
        typeof body.defaultTempPassword === 'string' && body.defaultTempPassword.trim()
          ? body.defaultTempPassword.trim()
          : undefined;

      const created: Array<ReturnType<typeof serializeUser> & { tempPassword: string }> = [];
      const updated: Array<ReturnType<typeof serializeUser>> = [];
      const skipped: Array<{ email: string; studentId?: string; reason: string }> = [];

      for (const raw of rawRows) {
        const parsed = BulkAccountRowSchema.safeParse({
          studentId: raw.studentId ?? raw.student_id,
          email: raw.email,
          fullName: raw.fullName ?? raw.full_name ?? raw.name,
          role: raw.role ? String(raw.role).toUpperCase() : 'STUDENT',
          department: raw.department,
          program: raw.program,
          yearOfStudy: raw.yearOfStudy ?? raw.year_of_study,
          phone: raw.phone,
          profileData: raw.profileData,
        });

        if (!parsed.success) {
          skipped.push({
            email: String(raw.email || ''),
            studentId: raw.studentId ? String(raw.studentId) : undefined,
            reason: parsed.error.issues[0]?.message || 'Invalid row data',
          });
          continue;
        }

        const row = parsed.data;
        const dbRole = toDbRole(row.role);
        const deptSlug = dbRole === 'ADMIN' ? null : (row.department?.toUpperCase() ?? null);
        const departmentId = dbRole === 'ADMIN' ? null : await resolveDepartmentId(deptSlug);

        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: row.email },
              ...(row.studentId ? [{ studentId: row.studentId }] : []),
            ],
          },
        });

        if (existing) {
          if (onDuplicate === 'skip') {
            skipped.push({
              email: row.email,
              studentId: row.studentId,
              reason: 'Account already exists in database',
            });
            continue;
          }

          const updatedRow = await prisma.user.update({
            where: { id: existing.id },
            data: {
              fullName: row.fullName,
              email: row.email,
              studentId: row.studentId ?? existing.studentId,
              role: dbRole as never,
              department: deptSlug ?? existing.department,
              departmentId: departmentId ?? existing.departmentId,
              phone: row.phone ?? existing.phone,
              ...(row.profileData ? { profileData: row.profileData as never } : {}),
            },
          });
          updated.push(serializeUser(updatedRow));
          continue;
        }

        const tempPassword = defaultTempPassword || generateTempPassword(10);
        const passwordHash = await hashPassword(tempPassword);

        const createdRow = await prisma.user.create({
          data: {
            studentId: row.studentId ?? null,
            email: row.email,
            fullName: row.fullName,
            passwordHash,
            role: dbRole as never,
            status: 'ACTIVE',
            department: deptSlug,
            departmentId,
            program: row.program ?? null,
            yearOfStudy: row.yearOfStudy ?? null,
            phone: row.phone ?? null,
            profileData: (row.profileData as never) ?? undefined,
            mustChangePassword: true,
          },
        });

        created.push({
          ...serializeUser(createdRow),
          tempPassword,
        });
      }

      return NextResponse.json({
        ok: true,
        data: { created, updated, skipped },
      });
    }

    // SINGLE ACCOUNT PROVISIONING
    const email = String(body?.email || '').trim().toLowerCase();
    const fullName = String(body?.name || body?.fullName || '').trim();
    const studentId = body?.studentId ? String(body.studentId).trim().toUpperCase() : null;
    const dbRole = toDbRole(body?.role);

    if (!email || !fullName) {
      return NextResponse.json(
        { ok: false, error: 'Full name and email are required.' },
        { status: 400 }
      );
    }

    if (dbRole === 'STUDENT' && !studentId) {
      return NextResponse.json(
        { ok: false, error: 'Student ID is required for STUDENT accounts.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(studentId ? [{ studentId }] : [])],
      },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'An account with this Email or Student ID already exists.' },
        { status: 409 }
      );
    }

    const tempPassword =
      typeof body?.password === 'string' && body.password.trim()
        ? body.password.trim()
        : 'password123';
    const passwordHash = await hashPassword(tempPassword);
    const deptSlug = dbRole === 'ADMIN' ? null : (body?.department ? String(body.department).toUpperCase() : null);
    const departmentId = dbRole === 'ADMIN' ? null : await resolveDepartmentId(deptSlug);

    const user = await prisma.user.create({
      data: {
        studentId,
        email,
        fullName,
        passwordHash,
        role: dbRole as never,
        status: body?.isActive === false ? 'SUSPENDED' : 'ACTIVE',
        department: deptSlug,
        departmentId,
        mustChangePassword: body?.mustChangePassword ?? true,
        ...(body?.profileData ? { profileData: body.profileData } : {}),
      },
    });

    return NextResponse.json(
      { ok: true, user: serializeUser(user), tempPassword },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/accounts error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to create account.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'User ID is required.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: body?.isActive ? 'ACTIVE' : 'SUSPENDED',
      },
    });

    return NextResponse.json({ ok: true, user: serializeUser(updated) });
  } catch (err) {
    console.error('PATCH /api/accounts error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update account status.' },
      { status: 500 }
    );
  }
}