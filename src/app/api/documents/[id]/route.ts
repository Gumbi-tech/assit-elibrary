// app/api/documents/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { canUserAccessDocument, getAccessContext } from '@/lib/document-access';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (ctx.role === 'STUDENT') {
      return NextResponse.json(
        { ok: false, error: 'Students are not permitted to update documents.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.document.findUnique({
      where: { id },
      include: { course: { select: { id: true, departmentId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
    }

    if (!canUserAccessDocument(ctx, existing)) {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const nextName =
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name;
    const nextCategory =
      typeof body.category === 'string' && body.category.trim()
        ? body.category.trim()
        : existing.category;

    let nextCourseId: string | null =
      body.courseId === '' || body.courseId === null
        ? null
        : typeof body.courseId === 'string'
          ? body.courseId
          : existing.courseId;

    let nextDepartmentId: string | null =
      typeof body.departmentId === 'string' && body.departmentId.trim()
        ? body.departmentId.trim()
        : existing.departmentId;

    if (nextCourseId) {
      const course = await prisma.course.findUnique({
        where: { id: nextCourseId },
        select: { id: true, departmentId: true },
      });
      if (!course) {
        return NextResponse.json(
          { ok: false, error: 'Selected course does not exist.' },
          { status: 404 }
        );
      }
      if (!nextDepartmentId) {
        nextDepartmentId = course.departmentId;
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        name: nextName,
        category: nextCategory,
        courseId: nextCourseId,
        departmentId: nextDepartmentId,
      },
      include: {
        course: { select: { id: true, title: true, code: true, departmentId: true } },
        department: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    const signedUrl = getStorageProvider().createSignedUrl(updated.path, 300);

    return NextResponse.json({
      ok: true,
      document: { ...updated, signedUrl },
    });
  } catch (err) {
    console.error('PATCH /api/documents/[id] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update document.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (ctx.role === 'STUDENT') {
      return NextResponse.json(
        { ok: false, error: 'Students are not permitted to delete documents.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.document.findUnique({
      where: { id },
      include: { course: { select: { departmentId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
    }

    if (!canUserAccessDocument(ctx, existing)) {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    await prisma.document.delete({ where: { id } });

    const storage = getStorageProvider() as { deleteFile?: (key: string) => Promise<void> };
    if (typeof storage.deleteFile === 'function' && existing.path) {
      await storage.deleteFile(existing.path).catch((e) => {
        console.warn('Storage delete warning:', e);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/documents/[id] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete document.' },
      { status: 500 }
    );
  }
}