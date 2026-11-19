// app/api/documents/route.ts
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'uploads');
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const documents = await prisma.document.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, documents });
  } catch (err) {
    console.error('GET /api/documents error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load documents.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'A valid file upload is required.' },
        { status: 400 }
      );
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'File exceeds the 25 MB upload limit.' },
        { status: 400 }
      );
    }

    const rawDisplayName = formData.get('name');
    const displayName =
      typeof rawDisplayName === 'string' && rawDisplayName.trim()
        ? rawDisplayName.trim()
        : fileEntry.name;

    const categoryRaw = formData.get('category');
    const category =
      typeof categoryRaw === 'string' && categoryRaw.trim()
        ? categoryRaw.trim()
        : null;

    const courseIdRaw = formData.get('courseId');
    const courseId =
      typeof courseIdRaw === 'string' && courseIdRaw.trim()
        ? courseIdRaw.trim()
        : null;

    const departmentIdRaw = formData.get('departmentId');
    let departmentId =
      typeof departmentIdRaw === 'string' && departmentIdRaw.trim()
        ? departmentIdRaw.trim()
        : null;

    const uploadedByIdRaw = formData.get('uploadedById');
    const uploadedById =
      typeof uploadedByIdRaw === 'string' && uploadedByIdRaw.trim()
        ? uploadedByIdRaw.trim()
        : null;

    // If a courseId is provided and departmentId wasn't explicitly passed, inherit the course's department
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, departmentId: true },
      });
      if (!course) {
        return NextResponse.json(
          { ok: false, error: 'Selected course does not exist.' },
          { status: 404 }
        );
      }
      if (!departmentId) {
        departmentId = course.departmentId;
      }
    }

    const safeBaseName = path
      .basename(fileEntry.name)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const fullDiskPath = path.join(UPLOAD_DIR, storedFilename);
    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    await writeFile(fullDiskPath, buffer);

    const document = await prisma.document.create({
      data: {
        name: displayName,
        filename: storedFilename,
        path: `storage/uploads/${storedFilename}`,
        size: fileEntry.size,
        mimeType: fileEntry.type || 'application/pdf',
        category,
        courseId,
        departmentId,
        uploadedById,
      },
      include: {
        course: { select: { id: true, title: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ ok: true, document }, { status: 201 });
  } catch (err) {
    console.error('POST /api/documents error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload document.' },
      { status: 500 }
    );
  }
}