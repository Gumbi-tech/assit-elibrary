// app/api/documents/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import {
  buildDocumentWhereClause,
  getAccessContext,
} from '@/lib/document-access';

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function isPdfFile(file: File): boolean {
  const hasPdfMime = file.type === 'application/pdf';
  const hasPdfExt = file.name.toLowerCase().endsWith('.pdf');
  return hasPdfMime || hasPdfExt;
}

export async function GET(req: Request) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const { where, feedback } = buildDocumentWhereClause(ctx, {
      courseId,
      departmentId,
    });
    const storage = getStorageProvider();

    const rows = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, code: true, departmentId: true } },
        department: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    const documents = rows.map((doc) => ({
      ...doc,
      signedUrl: storage.createSignedUrl(doc.path, 300),
    }));

    const resolvedFeedback =
      feedback.reason === 'OK' && documents.length === 0
        ? {
            ...feedback,
            reason: 'DEPARTMENT_EMPTY' as const,
            message: `No documents found in the database for ${
              ctx.departmentName || ctx.departmentCode || 'your department'
            }. Other departments' documents are not displayed.`,
          }
        : feedback;

    return NextResponse.json({
      ok: true,
      documents,
      feedback: resolvedFeedback,
    });
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
    const ctx = await getAccessContext();
    console.log('----------')
    console.log('----------')
    console.log(ctx)
    console.log('----------')
    console.log('----------')
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    if (ctx.role === 'STUDENT') {
      return NextResponse.json(
        { ok: false, error: 'Students are not permitted to upload documents.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get('file');

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'A valid PDF file upload is required.' },
        { status: 400 }
      );
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    if (fileEntry.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'PDF exceeds the 25 MB upload limit.' },
        { status: 400 }
      );
    }

    if (!isPdfFile(fileEntry)) {
      return NextResponse.json(
        { ok: false, error: 'Only PDF files are allowed.' },
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
        : 'Course PDF';

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

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const folder = departmentId ? `dept-${departmentId}` : 'general';
    const uploaded = await getStorageProvider().uploadPdf({
      buffer,
      originalFilename: fileEntry.name,
      mimeType: 'application/pdf',
      folder,
    });

    const document = await prisma.document.create({
      data: {
        name: displayName,
        filename: uploaded.storedFilename,
        path: uploaded.storageKey,
        size: uploaded.size,
        mimeType: 'application/pdf',
        category,
        courseId,
        departmentId,
        uploadedById: ctx.userId,
      },
      include: {
        course: { select: { id: true, title: true, code: true, departmentId: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const signedUrl = getStorageProvider().createSignedUrl(document.path, 300);

    return NextResponse.json(
      { ok: true, document: { ...document, signedUrl } },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/documents error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload PDF document.' },
      { status: 500 }
    );
  }
}