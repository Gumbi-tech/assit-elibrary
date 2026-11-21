import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body?.identifier || '').trim().toLowerCase();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');
    const confirmPassword = String(body?.confirmPassword ?? newPassword);

    if (!identifier || !currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: 'Identifier, current password, and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: 'New passwords do not match.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { studentId: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
    }

    const validCurrent = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!validCurrent) {
      return NextResponse.json(
        { ok: false, error: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        studentId: true,
        fullName: true,
        role: true,
        department: true,
        departmentId: true,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        ...updated,
        name: updated.fullName,
      },
    });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update password.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}