// app/api/documents/file/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider, verifyStorageSignature } from '@/lib/storage';
import { canReadDocuments, getAccessContext } from '@/lib/document-access';

function sanitizeDownloadFilename(rawName?: string | null): string {
  const cleaned = (rawName || 'document.pdf')
    .replace(/[\r\n"]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .trim();

  if (!cleaned) return 'document.pdf';
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

export async function GET(req: Request) {
  try {
    const ctx = await getAccessContext();
    if (!canReadDocuments(ctx)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Please sign in to access this file.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token')?.trim();

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
      select: {
        id: true,
        name: true,
        filename: true,
        path: true,
        mimeType: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    const fileBuffer = await getStorageProvider().readFile(doc.path);
    const download = searchParams.get('download') === '1';
    const dispositionType = download ? 'attachment' : 'inline';
    const safeFilename = sanitizeDownloadFilename(doc.filename || doc.name);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${safeFilename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store, max-age=0',
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