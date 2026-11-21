// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LoginSchema } from '@/lib/validators/account';
import { setSessionCookie, verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid credentials.' },
        { status: 400 }
      );
    }

    const rawId = parsed.data.identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawId.toLowerCase() },
          { studentId: rawId.toUpperCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'No account found for that Student ID or Email.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { ok: false, error: 'This account is inactive. Contact an administrator.' },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'Incorrect password for this account.' },
        { status: 401 }
      );
    }

    const sessionRole = user.role === 'ADMIN' ? 'ADMIN' : (user.role as 'STUDENT' | 'INSTRUCTOR' | 'LECTURER' | 'LIBRARIAN');
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      studentId: user.studentId,
      fullName: user.fullName,
      role: sessionRole,
      mustChangePassword: user.mustChangePassword,
    });

    return NextResponse.json({
      ok: true,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        studentId: user.studentId ?? undefined,
        name: user.fullName,
        email: user.email,
        role: user.role === 'ADMIN' ? 'SYSTEM_ADMIN' : user.role,
        department: user.department ?? undefined,
        departmentId: user.departmentId ?? undefined,
        mustChangePassword: user.mustChangePassword,
        isActive: true,
        createdAt: user.createdAt.toISOString().split('T')[0],
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return NextResponse.json({ ok: false, error: 'Login failed.' }, { status: 500 });
  }
}