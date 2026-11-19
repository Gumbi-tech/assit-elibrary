import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId') || undefined;

    const courses = await prisma.course.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: { code: 'asc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { documents: true } },
      },
    });

    return NextResponse.json({ ok: true, courses });
  } catch (err) {
    console.error('GET /api/courses error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load courses.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const departmentId =
      typeof body.departmentId === 'string' ? body.departmentId.trim() : '';
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;
    const credits =
      body.credits !== undefined && body.credits !== null && body.credits !== ''
        ? Number(body.credits)
        : 3;

    if (!title || !code || !departmentId) {
      return NextResponse.json(
        { ok: false, error: 'Course title, code, and departmentId are required.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(credits) || credits < 1) {
      return NextResponse.json(
        { ok: false, error: 'Credits must be a positive whole number.' },
        { status: 400 }
      );
    }

    const deptExists = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    if (!deptExists) {
      return NextResponse.json(
        { ok: false, error: 'Selected department does not exist.' },
        { status: 404 }
      );
    }

    const course = await prisma.course.create({
      data: { title, code, description, credits, departmentId },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ ok: true, course }, { status: 201 });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'A course with that code already exists.' },
        { status: 409 }
      );
    }
    console.error('POST /api/courses error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to create course.' },
      { status: 500 }
    );
  }
}