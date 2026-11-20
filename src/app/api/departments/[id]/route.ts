// LOCAL DEVELOPMENT ONLY — No authentication enforced. Do NOT deploy to production without auth/RBAC checks.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function extractId(
  req: Request,
  context?: { params?: Promise<{ id?: string }> | { id?: string } },
  body?: Record<string, unknown>
): Promise<string> {
  const resolvedParams = context?.params ? await context.params : undefined;
  if (resolvedParams?.id && typeof resolvedParams.id === 'string' && resolvedParams.id.trim()) {
    return decodeURIComponent(resolvedParams.id.trim());
  }
  const url = new URL(req.url);
  const queryId = url.searchParams.get('id');
  if (queryId && queryId.trim()) {
    return decodeURIComponent(queryId.trim());
  }
  if (body && typeof body.id === 'string' && body.id.trim()) {
    return body.id.trim();
  }
  return '';
}

export async function GET(
  req: Request,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const id = await extractId(req, context);

    if (id) {
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          _count: { select: { courses: true, documents: true, users: true } },
        },
      });

      if (!department) {
        return NextResponse.json(
          { ok: false, error: 'Department not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, department });
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { courses: true, documents: true, users: true } },
      },
    });
    return NextResponse.json({ ok: true, departments });
  } catch (err) {
    console.error('GET /api/departments error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load departments.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code =
      typeof body.code === 'string' && body.code.trim()
        ? body.code.trim().toUpperCase()
        : null;
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Department name is required.' },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: { name, code, description },
    });

    return NextResponse.json({ ok: true, department }, { status: 201 });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'A department with that name or code already exists.' },
        { status: 409 }
      );
    }
    console.error('POST /api/departments error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to create department.' },
      { status: 500 }
    );
  }
}

async function handleUpdate(
  req: Request,
  context?: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const body = await req.json();
    const id = await extractId(req, context, body);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Department id is required in route param, query (?id=...), or request body.' },
        { status: 400 }
      );
    }

    const data: {
      name?: string;
      code?: string | null;
      description?: string | null;
    } = {};

    if (body.name !== undefined) {
      const trimmedName = typeof body.name === 'string' ? body.name.trim() : '';
      if (!trimmedName) {
        return NextResponse.json(
          { ok: false, error: 'Department name cannot be empty.' },
          { status: 400 }
        );
      }
      data.name = trimmedName;
    }

    if (body.code !== undefined) {
      data.code =
        typeof body.code === 'string' && body.code.trim()
          ? body.code.trim().toUpperCase()
          : null;
    }

    if (body.description !== undefined) {
      data.description =
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid fields provided for update.' },
        { status: 400 }
      );
    }

    const department = await prisma.department.update({
      where: { id },
      data,
      include: {
        _count: { select: { courses: true, documents: true, users: true } },
      },
    });

    return NextResponse.json({ ok: true, department });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2025') {
      return NextResponse.json(
        { ok: false, error: 'Department not found.' },
        { status: 404 }
      );
    }
    if (prismaErr?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'A department with that name or code already exists.' },
        { status: 409 }
      );
    }
    console.error('UPDATE /api/departments error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update department.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  return handleUpdate(req, context);
}

export async function PUT(
  req: Request,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  return handleUpdate(req, context);
}

export async function DELETE(
  req: Request,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    let body: Record<string, unknown> | undefined;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }

    const id = await extractId(req, context, body);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Department id is required in route param, query (?id=...), or request body.' },
        { status: 400 }
      );
    }

    const deleted = await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, deleted });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2025') {
      return NextResponse.json(
        { ok: false, error: 'Department not found.' },
        { status: 404 }
      );
    }
    console.error('DELETE /api/departments error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete department.' },
      { status: 500 }
    );
  }
}