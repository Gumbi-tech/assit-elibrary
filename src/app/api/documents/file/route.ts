// app/api/documents/file/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider, verifyStorageSignature } from '@/lib/storage';
import { canUserAccessDocument, getAccessContext } from '@/lib/document-access';

export async function GET(req: Request) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Missing signed token.' },
        { status: 400 }
      );
    }

    const verified = verifyStorageSignature(token);
    if (!verified) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired document URL.' },
        { status: 403 }
      );
    }

    const doc = await prisma.document.findFirst({
      where: { path: verified.key },
      include: {
        course: { select: { departmentId: true } },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    if (!canUserAccessDocument(ctx, doc)) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: document belongs to another department.' },
        { status: 403 }
      );
    }

    const fileBuffer = await getStorageProvider().readFile(doc.path);
    const download = searchParams.get('download') === '1';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${doc.filename}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    console.error('GET /api/documents/file error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to serve document.' },
      { status: 500 }
    );
  }
}